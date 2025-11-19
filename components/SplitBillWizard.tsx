import React, { useState, useRef } from 'react';
import { BillItem, Friend, ReceiptData, Bill } from '../types';
import { parseReceiptImage } from '../services/geminiService';
import { addTransaction, saveBill } from '../services/dbService';
import { Camera, Loader2, Check, Plus, Trash2, Users } from 'lucide-react';

interface SplitBillWizardProps {
  friends: Friend[];
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'UPLOAD' | 'EDIT_ITEMS' | 'ASSIGN_PEOPLE' | 'SUMMARY';

// Local draft type using strings for inputs to support "text" input type
interface DraftItem {
  id: string;
  name: string;
  price: string;
  quantity: string;
  assignedTo: string[];
}

const SplitBillWizard: React.FC<SplitBillWizardProps> = ({ friends, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [isLoading, setIsLoading] = useState(false);
  const [billTitle, setBillTitle] = useState('Hangout Bill');
  
  // Bill State - using strings for editable fields to avoid number input issues
  const [items, setItems] = useState<DraftItem[]>([]);
  const [subtotal, setSubtotal] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [service, setService] = useState<string>('0');
  const [total, setTotal] = useState<string>('0');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Validate numeric input string
  const isValidNumberInput = (val: string) => val === '' || /^\d*\.?\d*$/.test(val);

  // Step 1: Handle File Upload & Gemini Analysis
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const data: ReceiptData = await parseReceiptImage(base64);
          
          // Transform ReceiptData to DraftItem (strings)
          const billItems: DraftItem[] = data.items.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            price: item.price.toString(),
            quantity: item.quantity.toString(),
            assignedTo: [] // Start unassigned
          }));

          setItems(billItems);
          setSubtotal((data.subtotal || 0).toString());
          setTax((data.tax || 0).toString());
          setService((data.serviceCharge || 0).toString());
          setTotal((data.total || 0).toString());
          setStep('EDIT_ITEMS');
        } catch (err) {
          alert('Failed to parse receipt. Please try again or input manualy.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleManualStart = () => {
    setItems([{ id: '1', name: 'Item 1', price: '0', quantity: '1', assignedTo: [] }]);
    setStep('EDIT_ITEMS');
  };

  // Step 2: Edit Items Logic
  const updateItem = (id: string, field: keyof DraftItem, value: any) => {
    setItems(prev => prev.map(item => {
       if (item.id === id) {
          if ((field === 'price' || field === 'quantity') && !isValidNumberInput(value)) {
             return item; // Ignore invalid input
          }
          return { ...item, [field]: value };
       }
       return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: 'New Item', price: '0', quantity: '1', assignedTo: [] }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Recalculate totals when items change in manual mode
  const recalculateTotal = () => {
    const newSub = items.reduce((acc, item) => acc + ((parseFloat(item.price)||0) * (parseFloat(item.quantity)||0)), 0);
    setSubtotal(newSub.toString());
    // Keep tax/service absolute for now, user can edit them
  };

  // Step 3: Assign Logic
  const toggleAssignment = (itemId: string, friendId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedTo.includes(friendId);
      return {
        ...item,
        assignedTo: isAssigned 
          ? item.assignedTo.filter(id => id !== friendId)
          : [...item.assignedTo, friendId]
      };
    }));
  };

  // Finalize Logic
  const finalizeSplit = async () => {
    setIsLoading(true);
    try {
        const numSub = parseFloat(subtotal) || 0;
        const numTax = parseFloat(tax) || 0;
        const numService = parseFloat(service) || 0;
        const numTotal = parseFloat(total) || (numSub + numTax + numService);
    
        // 1. Calculate multiplier (to distribute tax/service proportionally)
        // Use calculated subtotal from items if stored subtotal is 0 to avoid div/0
        const calcSubtotal = items.reduce((acc, i) => acc + ((parseFloat(i.price)||0) * (parseFloat(i.quantity)||0)), 0);
        const effectiveSubtotal = numSub > 0 ? numSub : calcSubtotal;
        
        const multiplier = effectiveSubtotal > 0 ? numTotal / effectiveSubtotal : 1;
    
        // 2. Iterate items and create debts
        const friendDebts: Record<string, number> = {};
    
        items.forEach(item => {
          if (item.assignedTo.length === 0) return; 
          
          const p = parseFloat(item.price) || 0;
          const q = parseFloat(item.quantity) || 0;
          const itemTotalCost = (p * q) * multiplier;
          const costPerPerson = itemTotalCost / item.assignedTo.length;
    
          item.assignedTo.forEach(friendId => {
            friendDebts[friendId] = (friendDebts[friendId] || 0) + costPerPerson;
          });
        });
    
        // 3. Save to DB (Using Promise.all for parallel async writes)
        const txPromises = Object.entries(friendDebts)
          .filter(([_, amount]) => amount > 0)
          .map(([friendId, amount]) => {
             return addTransaction(friendId, parseFloat(amount.toFixed(2)), 'EXPENSE', `Split Bill: ${billTitle}`);
          });
          
        await Promise.all(txPromises);
    
        // 4. Save Bill Record
        const finalItems: BillItem[] = items.map(item => ({
          ...item,
          price: parseFloat(item.price) || 0,
          quantity: parseFloat(item.quantity) || 0
        }));
    
        const bill: Bill = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          title: billTitle,
          items: finalItems,
          subtotal: effectiveSubtotal,
          tax: numTax,
          serviceCharge: numService,
          total: numTotal,
          payerId: 'admin'
        };
        await saveBill(bill);
    
        onSuccess();
    } catch (e) {
        alert('Error saving split data.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  // Renders

  if (step === 'UPLOAD') {
    return (
      <div className="space-y-6 text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800">New Split Bill</h2>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-400 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /> : <Camera className="w-12 h-12 text-emerald-600" />}
            <span className="mt-2 font-medium text-emerald-800">{isLoading ? 'Analyzing Receipt with AI...' : 'Scan Receipt (Gemini AI)'}</span>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </button>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          <button onClick={handleManualStart} className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition">
            Enter Manually
          </button>
        </div>
        <button onClick={onClose} className="text-gray-500 underline text-sm">Cancel</button>
      </div>
    );
  }

  if (step === 'EDIT_ITEMS') {
    return (
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Verify Items</h2>
          <button onClick={() => { recalculateTotal(); setStep('ASSIGN_PEOPLE'); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Next</button>
        </div>
        
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Bill Title</label>
            <input value={billTitle} onChange={e => setBillTitle(e.target.value)} className="w-full border border-gray-300 bg-white text-gray-900 rounded p-2" />
          </div>
          <div className="text-right">
             <p className="text-xs text-gray-500">Total Detected</p>
             <p className="text-xl font-bold text-emerald-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(total)||0)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <input 
                value={item.name} 
                onChange={e => updateItem(item.id, 'name', e.target.value)}
                className="flex-1 font-medium bg-transparent text-gray-900 border-b border-transparent focus:border-emerald-500 outline-none min-w-0"
                placeholder="Item Name"
              />
              <div className="flex items-center gap-2 shrink-0">
                <input 
                  type="text"
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                  className="w-12 text-center border border-gray-300 bg-white text-gray-900 rounded p-1 text-sm"
                  placeholder="Qty"
                />
                <span className="text-gray-400">x</span>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={item.price}
                  onChange={e => updateItem(item.id, 'price', e.target.value)}
                  className="w-24 text-right border border-gray-300 bg-white text-gray-900 rounded p-1 text-sm"
                  placeholder="Price"
                />
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 shrink-0 p-1 pl-2"><Trash2 size={18}/></button>
            </div>
          ))}
          <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
            <Plus size={16} /> Add Item
          </button>
        </div>

        <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded-lg">
           <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="text-gray-600">Tax</label>
              <input 
                type="text" 
                inputMode="decimal"
                value={tax} 
                onChange={e => { if(isValidNumberInput(e.target.value)) setTax(e.target.value) }} 
                className="text-right border border-gray-300 bg-white text-gray-900 rounded p-1" 
              />
              <label className="text-gray-600">Service Charge</label>
              <input 
                type="text"
                inputMode="decimal" 
                value={service} 
                onChange={e => { if(isValidNumberInput(e.target.value)) setService(e.target.value) }} 
                className="text-right border border-gray-300 bg-white text-gray-900 rounded p-1" 
              />
              <label className="font-bold text-gray-800">Total</label>
              <input 
                type="text" 
                inputMode="decimal"
                value={total} 
                onChange={e => { if(isValidNumberInput(e.target.value)) setTotal(e.target.value) }} 
                className="text-right border border-gray-300 bg-white text-gray-900 rounded p-1 font-bold" 
              />
           </div>
        </div>
      </div>
    );
  }

  if (step === 'ASSIGN_PEOPLE') {
    return (
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Who ate what?</h2>
          <button onClick={finalizeSplit} disabled={isLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 className="animate-spin" /> : <>Finalize <Check size={16} /></>}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Tap items to select, then tap friends to assign.</p>

        <div className="flex-1 overflow-y-auto space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="font-bold text-gray-900">{item.name}</span>
                <span className="text-gray-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format((parseFloat(item.price)||0) * (parseFloat(item.quantity)||0))}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {friends.map(friend => {
                  const isSelected = item.assignedTo.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleAssignment(item.id, friend.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        isSelected 
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {friend.name}
                    </button>
                  );
                })}
                {friends.length === 0 && <span className="text-red-500 text-xs">Add friends in dashboard first!</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default SplitBillWizard;