import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Friend, Transaction } from '../types';
import { getFriendByAccessCode, subscribeToTransactions, addTransaction, subscribeToFriends } from '../services/dbService';
import { LogOut, RefreshCw, Wallet, Upload, X, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface FriendPortalProps {
  onLogout: () => void;
}

const FriendPortal: React.FC<FriendPortalProps> = ({ onLogout }) => {
  const [accessCode, setAccessCode] = useState('');
  const [loggedInFriend, setLoggedInFriend] = useState<Friend | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payImage, setPayImage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-login check & Data Subscription
  useEffect(() => {
    const savedCode = localStorage.getItem('debt_tracker_friend_code');
    if (savedCode) {
      handleLoginLogic(savedCode);
    }
  }, []);

  // Realtime listener for logged in friend details (e.g., balance updates)
  useEffect(() => {
     if (!loggedInFriend) return;

     // Listen for transactions specific to this friend
     const unsubTx = subscribeToTransactions((txs) => {
        setHistory(txs);
     }, loggedInFriend.id);

     // Listen for friend profile updates (balance)
     // We subscribe to all friends but filter, because 'subscribeToFriends' is our exposed method.
     // Ideally we'd have 'subscribeToFriend(id)' but this works for now.
     const unsubFriend = subscribeToFriends((friends) => {
       const me = friends.find(f => f.id === loggedInFriend.id);
       if (me) setLoggedInFriend(me);
     });

     return () => {
       unsubTx();
       unsubFriend();
     }
  }, [loggedInFriend?.id]); // Re-run if ID changes (login)

  const handleLoginLogic = async (code: string) => {
    setIsLoading(true);
    try {
      const friend = await getFriendByAccessCode(code);
      if (friend) {
        setLoggedInFriend(friend);
        localStorage.setItem('debt_tracker_friend_code', code);
        setError('');
      } else {
        setError('Invalid access code');
        localStorage.removeItem('debt_tracker_friend_code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginLogic(accessCode);
  };

  const handleLogout = () => {
    localStorage.removeItem('debt_tracker_friend_code');
    setLoggedInFriend(null);
    onLogout();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openPayModal = (tx?: Transaction) => {
    if (tx) {
      setPayAmount(tx.amount.toString());
      setPayDesc(`Payment for: ${tx.description}`);
    } else {
      setPayAmount('');
      setPayDesc('Manual Payment');
    }
    setPayImage(undefined);
    setShowPayModal(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInFriend) return;
    if (!payImage) {
      alert("Please upload proof of payment.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction(
        loggedInFriend.id,
        parseFloat(payAmount),
        'PAYMENT',
        payDesc,
        'PENDING',
        payImage
      );
      setShowPayModal(false);
    } catch (e) {
      alert("Failed to submit payment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unsettledExpenseIds = useMemo(() => {
    const unresolved: { id: string; remaining: number }[] = [];
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach((tx) => {
      if (tx.type === 'EXPENSE' && tx.status !== 'REJECTED') {
        unresolved.push({ id: tx.id, remaining: Number(tx.amount) || 0 });
      } else if (tx.type === 'PAYMENT' && tx.status === 'APPROVED') {
        let payLeft = Number(tx.amount) || 0;
        while (payLeft > 0 && unresolved.length) {
          const current = unresolved[0];
          const applied = Math.min(current.remaining, payLeft);
          current.remaining -= applied;
          payLeft -= applied;
          if (current.remaining <= 0.0001) {
            unresolved.shift();
          }
        }
      }
    });

    return new Set(
      unresolved.filter(item => item.remaining > 0.0001).map(item => item.id)
    );
  }, [history]);

  if (!loggedInFriend) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="text-emerald-600 w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Check My Bill</h1>
            <p className="text-gray-500">Enter the code shared by your friend</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              placeholder="Enter 6-digit Code"
              className="w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-emerald-500 focus:outline-none"
              maxLength={6}
            />
            {error && <p className="text-red-500 text-center text-sm">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition flex justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Access Dashboard'}
            </button>
          </form>
          <button onClick={onLogout} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">I am the Admin</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
              {loggedInFriend.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Hi, {loggedInFriend.name}</h1>
              <p className="text-xs text-gray-500">Access Code: {loggedInFriend.accessCode}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-1">You Owe</p>
          <h2 className="text-4xl font-bold mb-4">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(loggedInFriend.balance)}
          </h2>
          <div className="flex gap-2">
             <button onClick={() => openPayModal()} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2">
                <Wallet size={18} /> Pay Custom Amount
             </button>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <RefreshCw size={16} /> Recent Activity
          </h3>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions yet.</p>
            ) : (
              history.map(tx => {
                const showPayButton = tx.type === 'EXPENSE' && tx.status === 'APPROVED' && unsettledExpenseIds.has(tx.id);
                const isSettledExpense = tx.type === 'EXPENSE' && tx.status === 'APPROVED' && !showPayButton;
                return (
                <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3">
                       {/* Icon based on status/type */}
                       <div className="mt-1">
                          {tx.status === 'PENDING' ? (
                            <Clock className="text-yellow-500" size={20} />
                          ) : tx.status === 'REJECTED' ? (
                            <AlertCircle className="text-red-500" size={20} />
                          ) : tx.type === 'PAYMENT' ? (
                            <CheckCircle className="text-emerald-500" size={20} />
                          ) : (
                            <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                          )}
                       </div>
                      <div>
                       <p className="font-medium text-gray-900">{tx.description}</p>
                       <p className="text-xs text-gray-500">
                         {new Date(tx.date).toLocaleDateString()} 
                          {tx.status !== 'APPROVED' && <span className={`ml-2 font-bold ${tx.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'}`}>({tx.status})</span>}
                          {isSettledExpense && <span className="ml-2 font-semibold text-emerald-600">(Settled)</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.type === 'EXPENSE' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {tx.type === 'EXPENSE' ? '+' : '-'}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tx.amount)}
                    </span>
                  </div>
                  
                  {/* Action Button for Debt Items */}
                  {showPayButton && (
                    <button 
                      onClick={() => openPayModal(tx)}
                      className="w-full mt-2 py-2 text-sm border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                    >
                      Pay This Debt
                    </button>
                  )}
                </div>
              );
            })
            )}
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Upload Payment Proof</h3>
              <button onClick={() => setShowPayModal(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Amount</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-3 font-bold text-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Description</label>
                <input 
                  type="text" 
                  value={payDesc}
                  onChange={e => setPayDesc(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-3"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Proof of Payment (Screenshot/Photo)</label>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition"
                >
                  {payImage ? (
                    <img src={payImage} alt="Proof" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <>
                      <Upload className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Tap to Upload</span>
                    </>
                  )}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex justify-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendPortal;
