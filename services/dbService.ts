import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  runTransaction, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Friend, Transaction, Bill, TransactionStatus } from "../types";

const COLLECTION = {
  FRIENDS: 'friends',
  TRANSACTIONS: 'transactions',
  BILLS: 'bills',
};

// --- Friends ---

// Subscribe to Friends List (Realtime)
export const subscribeToFriends = (callback: (friends: Friend[]) => void) => {
  const q = query(collection(db, COLLECTION.FRIENDS), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const friends = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Friend));
    callback(friends);
  });
};

export const addFriend = async (name: string): Promise<Friend> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newFriendData = {
    name,
    accessCode,
    balance: 0,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, COLLECTION.FRIENDS), newFriendData);
  return { id: docRef.id, ...newFriendData } as unknown as Friend;
};

export const getFriendByAccessCode = async (code: string): Promise<Friend | null> => {
  const q = query(collection(db, COLLECTION.FRIENDS), where("accessCode", "==", code));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Friend;
  }
  return null;
};

export const deleteFriendAndTransactions = async (friendId: string) => {
  const friendRef = doc(db, COLLECTION.FRIENDS, friendId);
  const txQuery = query(collection(db, COLLECTION.TRANSACTIONS), where("friendId", "==", friendId));
  const txSnapshot = await getDocs(txQuery);

  const batch = writeBatch(db);
  batch.delete(friendRef);
  txSnapshot.forEach((txDoc) => batch.delete(txDoc.ref));

  await batch.commit();
};

// --- Transactions & Balances ---

// Subscribe to Transactions (Realtime)
export const subscribeToTransactions = (callback: (txs: Transaction[]) => void, friendId?: string) => {
  let q;
  let sortLocally = false;

  if (friendId) {
    // Keep this query simple (no orderBy) to avoid requiring composite indexes for every friend.
    // We'll sort the resulting list client-side to maintain a consistent experience.
    q = query(
      collection(db, COLLECTION.TRANSACTIONS),
      where("friendId", "==", friendId)
    );
    sortLocally = true;
  } else {
    q = query(
      collection(db, COLLECTION.TRANSACTIONS), 
      orderBy("date", "desc")
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      let txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      if (sortLocally) {
        txs = txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      callback(txs);
    },
    (error) => {
      console.error("Transaction subscription error:", error);
      callback([]);
    }
  );
};

// Add Transaction with Atomic Balance Update
export const addTransaction = async (
  friendId: string, 
  amount: number, 
  type: 'PAYMENT' | 'EXPENSE', 
  description: string,
  status: TransactionStatus = 'APPROVED',
  proofImage?: string
) => {
  const numAmount = parseFloat(String(amount));
  if (isNaN(numAmount)) throw new Error("Invalid Amount");

  const newTx = {
    friendId,
    amount: numAmount,
    type,
    date: new Date().toISOString(), // Storing as ISO string for easy frontend parsing
    description,
    status,
    proofImage: proofImage || null,
    createdAt: serverTimestamp()
  };

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create Transaction Ref
      const txRef = doc(collection(db, COLLECTION.TRANSACTIONS));
      
      // 2. Get Friend Ref for Balance Update
      const friendRef = doc(db, COLLECTION.FRIENDS, friendId);
      const friendDoc = await transaction.get(friendRef);
      
      if (!friendDoc.exists()) {
        throw new Error("Friend does not exist!");
      }

      // 3. Write Transaction
      transaction.set(txRef, newTx);

      // 4. Update Balance ONLY if APPROVED
      if (status === 'APPROVED') {
        const currentBalance = friendDoc.data().balance || 0;
        const balanceChange = type === 'EXPENSE' ? numAmount : -numAmount;
        let newBalance = currentBalance + balanceChange;
        
        // Snap to zero logic
        if (Math.abs(newBalance) < 0.01) newBalance = 0;

        transaction.update(friendRef, { balance: newBalance });
      }
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};

export const updateTransactionStatus = async (txId: string, newStatus: TransactionStatus) => {
  try {
    await runTransaction(db, async (transaction) => {
      const txRef = doc(db, COLLECTION.TRANSACTIONS, txId);
      const txDoc = await transaction.get(txRef);
      
      if (!txDoc.exists()) throw new Error("Transaction not found");

      const txData = txDoc.data() as Transaction;
      const oldStatus = txData.status;

      if (oldStatus === newStatus) return; // No change

      const friendRef = doc(db, COLLECTION.FRIENDS, txData.friendId);
      const friendDoc = await transaction.get(friendRef);
      
      if (!friendDoc.exists()) throw new Error("Friend not found");

      const currentBalance = friendDoc.data().balance || 0;
      const numAmount = parseFloat(String(txData.amount));
      let balanceChange = 0;

      // Logic to revert old effect and apply new effect
      // Simplified: Only affect balance if moving TO or FROM 'APPROVED'
      
      // Case 1: Was PENDING/REJECTED -> Now APPROVED (Apply effect)
      if (oldStatus !== 'APPROVED' && newStatus === 'APPROVED') {
        balanceChange = txData.type === 'EXPENSE' ? numAmount : -numAmount;
      }
      
      // Case 2: Was APPROVED -> Now REJECTED/PENDING (Revert effect)
      else if (oldStatus === 'APPROVED' && newStatus !== 'APPROVED') {
        balanceChange = txData.type === 'EXPENSE' ? -numAmount : numAmount; // Reverse
      }

      let newBalance = currentBalance + balanceChange;
      if (Math.abs(newBalance) < 0.01) newBalance = 0;

      transaction.update(txRef, { status: newStatus });
      transaction.update(friendRef, { balance: newBalance });
    });
  } catch (e) {
    console.error("Update status failed:", e);
    throw e;
  }
};

// Settle Debt (Pay Full Amount)
export const settleFriendDebt = async (friendId: string) => {
  try {
    await runTransaction(db, async (transaction) => {
      const friendRef = doc(db, COLLECTION.FRIENDS, friendId);
      const friendDoc = await transaction.get(friendRef);

      if (!friendDoc.exists()) throw new Error("Friend not found");

      const currentBalance = friendDoc.data().balance || 0;

      if (currentBalance <= 0) return; // Nothing to settle

      // Create Payment Transaction
      const txRef = doc(collection(db, COLLECTION.TRANSACTIONS));
      const paymentTx = {
        friendId,
        amount: currentBalance,
        type: 'PAYMENT',
        date: new Date().toISOString(),
        description: 'Manual Settle Up (Admin)',
        status: 'APPROVED',
        createdAt: serverTimestamp()
      };

      transaction.set(txRef, paymentTx);
      transaction.update(friendRef, { balance: 0 });
    });
  } catch (e) {
    console.error("Settle up failed:", e);
    throw e;
  }
};

// --- Bills ---

export const saveBill = async (bill: Bill) => {
  await addDoc(collection(db, COLLECTION.BILLS), bill);
};
