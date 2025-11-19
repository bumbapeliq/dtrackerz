import React, { useState, useEffect } from 'react';
import { Friend, Transaction } from './types';
import { 
  subscribeToFriends, 
  subscribeToTransactions, 
  addFriend, 
  addTransaction, 
  updateTransactionStatus,
  settleFriendDebt,
  deleteFriendAndTransactions
} from './services/dbService';
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import SplitBillWizard from './components/SplitBillWizard';
import FriendPortal from './components/FriendPortal';
import { Plus, Users, Receipt, TrendingUp, UserPlus, X, Bell, Check, Ban, Eye, Wallet, ArrowRight, ShieldCheck, LogOut, Lock, ChevronLeft, Loader2, Trash2 } from 'lucide-react';

// --- ADMIN LOGIN COMPONENT ---
const AdminLogin = ({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
         setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
         setError('User not found.');
      } else {
         setError('Authentication failed. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-gray-500">Sign in with Firebase Auth</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- LANDING PAGE COMPONENT ---
const LandingPage = ({ onAdminClick, onFriendLogin }: { onAdminClick: () => void, onFriendLogin: () => void }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Hero */}
        <div className="p-8 md:p-12 flex-1 flex flex-col justify-center bg-emerald-50/50">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <TrendingUp className="text-emerald-600 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">DebtTracker Pro</h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            The easiest way to split bills, track shared expenses, and manage repayments with your friends.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" /> AI Receipt Scan
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" /> Real-time Balance
            </div>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="p-8 md:p-12 flex-1 bg-white flex flex-col justify-center space-y-6">
          <div className="text-center md:text-left mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-500">Choose how you want to continue</p>
          </div>

          <button 
            onClick={onFriendLogin}
            className="group relative w-full bg-white border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-4"
          >
            <div className="bg-emerald-100 p-3 rounded-lg group-hover:bg-white transition-colors">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">I am a Friend</h3>
              <p className="text-xs text-gray-500">Pay debts & check history</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
          </button>

          <button 
            onClick={onAdminClick}
            className="group relative w-full bg-white border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-4"
          >
            <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-white transition-colors">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">I am the Admin</h3>
              <p className="text-xs text-gray-500">Manage bills & approvals</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-emerald-100/60 text-xs">
        © 2025 DebtTracker. Secure & Private.
      </div>
    </div>
  );
};

// --- MAIN APP ---

function App() {
  // Initialize view from localStorage or default to LANDING
  const [view, setView] = useState<'LANDING' | 'ADMIN_LOGIN' | 'ADMIN' | 'PORTAL'>(() => {
    return (localStorage.getItem('debt_tracker_view') as any) || 'LANDING';
  });

  const [friends, setFriends] = useState<Friend[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showSplitWizard, setShowSplitWizard] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Manual Debt Modal State
  const [showManualDebt, setShowManualDebt] = useState(false);
  const [manualDebtData, setManualDebtData] = useState({ friendId: '', amount: '', desc: '' });

  // Proof Modal
  const [proofModalTx, setProofModalTx] = useState<Transaction | null>(null);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);

  // --- AUTH & DATA SUBSCRIPTIONS ---

  useEffect(() => {
    // Persist view state
    localStorage.setItem('debt_tracker_view', view);

    // If in Admin View, Subscribe to Data
    let unsubFriends: () => void;
    let unsubTxs: () => void;

    if (view === 'ADMIN') {
       unsubFriends = subscribeToFriends(setFriends);
       unsubTxs = subscribeToTransactions(setTransactions);
    }

    return () => {
      if (unsubFriends) unsubFriends();
      if (unsubTxs) unsubTxs();
    }
  }, [view]);

  // Check Firebase Auth Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && view === 'ADMIN_LOGIN') {
        setView('ADMIN');
      } else if (!user && view === 'ADMIN') {
        setView('ADMIN_LOGIN'); // Kick out if session expired
      }
    });
    return unsubscribe;
  }, [view]);


  // Handlers
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('debt_tracker_view');
    setView('LANDING');
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFriendName.trim()) {
      setIsLoading(true);
      try {
        await addFriend(newFriendName);
        setNewFriendName('');
        setShowAddFriend(false);
      } catch (e) {
        alert('Error adding friend');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddManualDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualDebtData.friendId && manualDebtData.amount && !isNaN(parseFloat(manualDebtData.amount))) {
      setIsLoading(true);
      try {
        await addTransaction(
          manualDebtData.friendId,
          parseFloat(manualDebtData.amount),
          'EXPENSE',
          manualDebtData.desc || 'Manual Debt',
          'APPROVED'
        );
        setShowManualDebt(false);
        setManualDebtData({ friendId: '', amount: '', desc: '' });
      } catch (e) {
        alert("Error adding debt");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Admin Settle Up (Manual, no image)
  const handleSettleUp = async (e: React.MouseEvent, friendId: string) => {
     e.stopPropagation();
     const friend = friends.find(f => f.id === friendId);
     const bal = parseFloat(String(friend?.balance)) || 0;
     
     if (!friend || bal <= 0) return;
     
     if(confirm(`Confirm manual cash payment of ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bal)} from ${friend.name}?`)) {
        try {
          await settleFriendDebt(friendId);
        } catch (e) {
          alert("Failed to settle up. Try again.");
        }
     }
  };

  const handleApprovePayment = async (txId: string) => {
    try {
      await updateTransactionStatus(txId, 'APPROVED');
      setProofModalTx(null);
    } catch (e) {
      alert("Error approving payment");
    }
  };

  const handleRejectPayment = async (txId: string) => {
    try {
      await updateTransactionStatus(txId, 'REJECTED');
      setProofModalTx(null);
    } catch (e) {
      alert("Error rejecting payment");
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    const balance = Number(friend.balance) || 0;
    const warning = balance !== 0 
      ? `${friend.name} still has a balance of ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(balance)}. Deleting will also remove their history. Continue?`
      : `Delete ${friend.name} and remove their entire transaction history?`;

    if (!confirm(warning)) return;

    setDeletingFriendId(friendId);
    try {
      await deleteFriendAndTransactions(friendId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete friend. Try again.');
    } finally {
      setDeletingFriendId(null);
    }
  };

  // Helper for numeric inputs
  const handleAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setManualDebtData({ ...manualDebtData, amount: val });
    }
  };

  // Derived state
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');
  
  // Calculations (using Number() to be safe)
  const totalReceivables = friends.reduce((acc, f) => acc + (Number(f.balance) || 0), 0);
  const totalOutlaid = transactions
    .filter(t => t.type === 'EXPENSE' && t.status !== 'REJECTED')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // --- VIEW RENDER LOGIC ---

  if (view === 'LANDING') {
    return <LandingPage onAdminClick={() => setView('ADMIN_LOGIN')} onFriendLogin={() => setView('PORTAL')} />;
  }

  if (view === 'ADMIN_LOGIN') {
    return <AdminLogin onLogin={() => setView('ADMIN')} onBack={() => setView('LANDING')} />;
  }

  if (view === 'PORTAL') {
    return <FriendPortal onLogout={() => setView('LANDING')} />;
  }

  // Admin View
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">DebtTracker <span className="text-xs font-normal text-gray-500 border border-gray-200 rounded px-1">Admin</span></span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-600 transition flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Pending Approvals Section */}
        {pendingTransactions.length > 0 && (
          <div className="mb-8">
             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
               <Bell className="text-yellow-500 fill-yellow-500" size={20} /> Pending Approvals
             </h2>
             <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {pendingTransactions.map(tx => {
                   const friend = friends.find(f => f.id === tx.friendId);
                   return (
                     <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-gray-900">{friend?.name || 'Unknown'}</p>
                           <p className="text-sm text-gray-500">{tx.description}</p>
                           <p className="font-mono font-bold text-emerald-600 mt-1">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(tx.amount))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           {tx.proofImage && (
                             <button onClick={() => setProofModalTx(tx)} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
                                <Eye size={20} />
                             </button>
                           )}
                           <button onClick={() => handleRejectPayment(tx.id)} className="p-2 bg-red-50 rounded-lg text-red-600 hover:bg-red-100">
                              <Ban size={20} />
                           </button>
                           <button onClick={() => handleApprovePayment(tx.id)} className="p-2 bg-emerald-50 rounded-lg text-emerald-600 hover:bg-emerald-100">
                              <Check size={20} />
                           </button>
                        </div>
                     </div>
                   )
                })}
             </div>
          </div>
        )}

        {/* Dashboard Summary & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Receivables */}
          <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-emerald-100 text-sm font-medium mb-1">Total Receivables</h3>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalReceivables)}
              </p>
            </div>
            <p className="text-xs text-emerald-200 mt-4">Current unpaid debt</p>
          </div>

          {/* Card 2: Total Outlaid */}
          <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-blue-100 text-sm font-medium mb-1">Total Outlaid</h3>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalOutlaid)}
              </p>
            </div>
            <p className="text-xs text-blue-200 mt-4">Lifetime expenses tracked</p>
          </div>

          {/* Action 1: Scan */}
          <button onClick={() => setShowSplitWizard(true)} className="bg-white border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 p-6 rounded-2xl flex flex-col items-center justify-center transition group min-h-[140px]">
            <div className="p-3 bg-gray-100 rounded-full mb-3 group-hover:bg-white transition">
              <Receipt className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-bold">Scan & Split Bill</span>
          </button>
          
          {/* Action 2: Manual */}
           <button onClick={() => setShowManualDebt(true)} className="bg-white border border-gray-200 hover:shadow-md p-6 rounded-2xl flex flex-col items-center justify-center transition text-gray-600 min-h-[140px]">
            <div className="p-3 bg-gray-100 rounded-full mb-3 group-hover:bg-gray-200 transition">
               <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">Add Manual Debt</span>
          </button>
        </div>

        {/* Friends List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} /> Friends
          </h2>
          <button onClick={() => setShowAddFriend(true)} className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 flex items-center gap-1">
            <UserPlus size={14} /> Add Friend
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map(friend => {
            const bal = parseFloat(String(friend.balance)) || 0;
            return (
            <div key={friend.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group">
              <button 
                type="button"
                onClick={() => handleDeleteFriend(friend.id)}
                disabled={deletingFriendId === friend.id}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition disabled:opacity-50"
                title="Delete friend"
              >
                {deletingFriendId === friend.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
              <div className="flex justify-between items-start mb-3">
                <div>
                   <h3 className="font-bold text-lg">{friend.name}</h3>
                   <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Code: {friend.accessCode}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Owes you</p>
                  <p className={`font-bold ${bal > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bal)}
                  </p>
                </div>
              </div>
              {bal > 0 && (
                 <button 
                   onClick={(e) => handleSettleUp(e, friend.id)}
                   className="w-full py-2 mt-2 text-sm border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition font-medium active:bg-emerald-100"
                 >
                   Mark Cash Paid
                 </button>
              )}
            </div>
            );
          })}
          {friends.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
              <p className="text-gray-400">No friends yet. Add one to start tracking!</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {transactions.filter(t => t.status !== 'REJECTED').slice(0, 5).map((tx) => {
              const friendName = friends.find(f => f.id === tx.friendId)?.name || 'Unknown';
              return (
                <div key={tx.id} className="p-4 border-b border-gray-50 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.type === 'EXPENSE' ? 'bg-red-500' : tx.status === 'PENDING' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{friendName}</p>
                      <p className="text-xs text-gray-500">
                         {tx.description} • {new Date(tx.date).toLocaleDateString()}
                         {tx.status === 'PENDING' && <span className="ml-1 text-yellow-600 font-bold">(Pending)</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono font-medium ${tx.type === 'EXPENSE' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {tx.type === 'EXPENSE' ? '+' : '-'}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(tx.amount))}
                  </span>
                </div>
              )
            })}
            {transactions.length === 0 && (
              <div className="p-8 text-center text-gray-400">No recent activity</div>
            )}
          </div>
        </div>

        {/* Add Friend Modal */}
        {showAddFriend && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
               <h3 className="text-lg font-bold mb-4 text-gray-800">Add New Friend</h3>
               <form onSubmit={handleAddFriend}>
                 <input 
                   autoFocus
                   value={newFriendName}
                   onChange={e => setNewFriendName(e.target.value)}
                   placeholder="Friend's Name"
                   className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl p-3 mb-4 focus:border-emerald-500 focus:outline-none"
                 />
                 <div className="flex gap-2 justify-end">
                   <button type="button" onClick={() => setShowAddFriend(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                   <button type="submit" disabled={isLoading} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2">
                      {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Add'}
                   </button>
                 </div>
               </form>
            </div>
          </div>
        )}

        {/* Manual Debt Modal */}
        {showManualDebt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm relative">
               <button onClick={() => setShowManualDebt(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
               <h3 className="text-lg font-bold mb-4 text-gray-800">Add Manual Debt</h3>
               <form onSubmit={handleAddManualDebt} className="space-y-4">
                 <div>
                   <label className="text-xs text-gray-500 mb-1 block">Who owes you?</label>
                   <select 
                      value={manualDebtData.friendId}
                      onChange={e => setManualDebtData({...manualDebtData, friendId: e.target.value})}
                      className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl p-3 focus:border-emerald-500 outline-none"
                      required
                   >
                      <option value="">Select Friend</option>
                      {friends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                   <input 
                     type="text"
                     inputMode="decimal"
                     value={manualDebtData.amount}
                     onChange={e => handleAmountChange(e.target.value)}
                     placeholder="0"
                     className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl p-3 focus:border-emerald-500 outline-none font-bold"
                     required
                   />
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 mb-1 block">Description</label>
                   <input 
                     value={manualDebtData.desc}
                     onChange={e => setManualDebtData({...manualDebtData, desc: e.target.value})}
                     placeholder="e.g. Coffee, Taxi"
                     className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl p-3 focus:border-emerald-500 outline-none"
                   />
                 </div>
                 <button type="submit" disabled={isLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex justify-center">
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Save Debt'}
                 </button>
               </form>
            </div>
          </div>
        )}

        {/* Proof Image Modal */}
        {proofModalTx && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setProofModalTx(null)}>
              <div className="bg-white p-2 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-center p-2 border-b">
                    <h3 className="font-bold">Payment Proof</h3>
                    <button onClick={() => setProofModalTx(null)}><X /></button>
                 </div>
                 <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
                    <img src={proofModalTx.proofImage || ''} alt="Proof" className="max-w-full h-auto rounded shadow" />
                 </div>
                 <div className="p-4 grid grid-cols-2 gap-4">
                    <button onClick={() => handleRejectPayment(proofModalTx.id)} className="py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200">Reject</button>
                    <button onClick={() => handleApprovePayment(proofModalTx.id)} className="py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">Approve</button>
                 </div>
              </div>
           </div>
        )}

        {/* Split Bill Wizard Overlay */}
        {showSplitWizard && (
          <div className="fixed inset-0 bg-white z-50 overflow-auto">
            <div className="max-w-2xl mx-auto min-h-screen flex flex-col p-4">
              <div className="flex justify-end">
                <button onClick={() => setShowSplitWizard(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24} /></button>
              </div>
              <div className="flex-1">
                 <SplitBillWizard 
                   friends={friends} 
                   onClose={() => setShowSplitWizard(false)}
                   onSuccess={() => {
                      setShowSplitWizard(false);
                      alert("Bill split saved successfully!");
                   }}
                 />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
