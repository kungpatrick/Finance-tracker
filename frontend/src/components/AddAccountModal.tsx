import React, { useState } from 'react';
import { useAccounts, Account } from '../hooks/useAccounts';

interface AddAccountModalProps {
  onClose: () => void;
  onAccountAdded?: () => void;
  initialData?: (Account & { hasTransactions?: boolean }) | null; // Updated type
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onAccountAdded, initialData }) => {
  const { addAccount, updateAccount } = useAccounts();
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'checking' | 'savings' | 'credit' | 'investment' | 'other'>(initialData?.type || 'checking');
  const hasTransactions = initialData?.hasTransactions || false; // Get the flag
  const [currency, setCurrency] = useState(initialData?.currency || 'USD');
  const [institution, setInstitution] = useState(initialData?.institution || '');
  const [balance, setBalance] = useState(initialData?.balance.toString() || '0');
  const [submitting, setSubmitting] = useState(false);

  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'CAD', symbol: 'CA$' },
    { code: 'AUD', symbol: 'AU$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'CNY', symbol: '元' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const numericBalance = parseFloat(balance) || 0;
    const accountData = {
      name,
      type,
      currency,
      institution: institution || undefined,
      balance: numericBalance,
      cleared_balance: numericBalance, // Initialize cleared_balance to match balance
    };

    let result;
    if (initialData) {
      result = await updateAccount(initialData.id, accountData);
    } else {
      result = await addAccount(accountData);
    }

    setSubmitting(false);
    if (result.success) {
      if (onAccountAdded) onAccountAdded();
      onClose();
    } else {
      alert(`Error ${initialData ? 'updating' : 'adding'} account: ` + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
        
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{initialData ? 'Update Account' : 'Link New Account'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. Main Checking" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
              <option value="investment">Investment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Institution</label>
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. Chase, Fidelity" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Balance ($)</label>
            <input 
              required 
              type="number" 
              step="0.01" 
              value={balance} 
              onChange={(e) => setBalance(e.target.value)} 
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white font-mono ${hasTransactions ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
              aria-label="Current Balance"
              disabled={hasTransactions} // Disable if transactions exist
            />
            {initialData && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 italic">
                {hasTransactions
                  ? "Note: Balance cannot be directly edited as transactions are associated with this account. Please add an adjustment transaction to change the balance."
                  : "Note: Manually overriding the balance will shift your entire wealth history up or down without creating a transaction record."
                }
              </p>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-all">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};