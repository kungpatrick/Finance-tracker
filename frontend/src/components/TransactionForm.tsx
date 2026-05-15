import React, { useState, useRef, useMemo } from 'react';
import { Transaction, TransactionInsert } from '../hooks/useTransactions';
import { transactionSchema } from './transaction.schema';
import { ZodError } from 'zod';
import { Account } from '../hooks/useAccounts';

interface TransactionFormProps {
  userId?: string;
  addTransaction: (transaction: Omit<TransactionInsert, 'id' | 'receipt_url'>, file?: File) => Promise<{ success: boolean; data: any; error?: string }>;
  existingTransactions: Transaction[];
  accounts: Account[];
  categories: string[];
  initialData?: Transaction | null;
  onCancelEdit?: () => void;
  onApplyRules?: (description: string) => { category: string | null, tags: string[], alias?: string | null } | null;
  onUpdateTransaction?: (id: string, updates: Partial<TransactionInsert>) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void; // Add this prop
}

interface TransactionSplit {
  category: string;
  amount: number;
  notes: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  userId, 
  addTransaction, 
  existingTransactions = [], 
  accounts = [], 
  categories = [],
  initialData,
  onCancelEdit,
  onApplyRules,
  onUpdateTransaction,
  onSuccess // Destructure the new prop
}) => {
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [transactionDate, setTransactionDate] = useState(initialData?.transaction_date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>((initialData?.type as any) || 'expense');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSplit, setIsSplit] = useState(!!(initialData?.splits && Array.isArray(initialData.splits) && (initialData.splits as any[]).length > 0));
  const [splits, setSplits] = useState<TransactionSplit[]>((initialData?.splits as unknown as TransactionSplit[]) || []);
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState(initialData?.account_id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.to_account_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge custom categories with any existing ones found in transactions
  const availableCategories = useMemo(() => {
    const combined = new Set([...categories]);
    
    // Force inclusion of system categories so they are always selectable in the UI
    combined.add('Debts');
    combined.add('General');
    combined.add('Savings');

    // Ensure current form state and initial data categories are visible
    if (category) combined.add(category);
    if (initialData?.category) combined.add(initialData.category);

    // Ensure 'Transfer' is always an available option if it's a transfer type
    if (type === 'transfer') combined.add('Transfer');
    return Array.from(combined).sort();
  }, [categories, category, initialData?.category, type]); 

  const remainingToSplit = useMemo(() => {
    const total = parseFloat(amount) || 0;
    const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    return Number((total - splitTotal).toFixed(2));
  }, [amount, splits]);

  const handleAddSplit = () => {
    setSplits([...splits, { category: 'General', amount: remainingToSplit > 0 ? remainingToSplit : 0, notes: '' }]);
  };

  const updateSplit = (index: number, updates: Partial<TransactionSplit>) => {
    const next = [...splits];
    next[index] = { ...next[index], ...updates };
    setSplits(next);
  };

  const handleFieldChange = (setter: (val: string) => void, field: string) => (e: React.ChangeEvent<any>) => {
    setter(e.target.value);
    if (errors[field]) setErrors(prev => { const n = {...prev}; delete n[field]; return n; });

    // Auto-apply rules if description is changing
    if (field === 'description' && onApplyRules && !initialData) {
      const suggestion = onApplyRules(e.target.value);
      if (suggestion) {
        if (suggestion.alias) setDescription(suggestion.alias);
        if (suggestion.category) setCategory(suggestion.category);
        if (suggestion.tags.length > 0) setTags(suggestion.tags.join(', '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setErrors({ general: "You must be logged in to add transactions." });
      return;
    }

    setSubmitting(true);
    setErrors({}); // Clear previous errors

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrors({ amount: "Amount must be a positive number." });
      setSubmitting(false);
      return;
    }

    if (isSplit && remainingToSplit !== 0) {
      setErrors({ general: `Split total must match transaction amount. Remaining: $${remainingToSplit}` });
      return;
    }

    if (type === 'transfer') {
      if (!accountId) {
        setErrors({ account_id: "Please select a 'From Account' for transfers." });
        setSubmitting(false);
        return;
      }
      if (!toAccountId) {
        setErrors({ to_account_id: "Please select a 'To Account' for transfers." });
        setSubmitting(false);
        return;
      }
      if (accountId === toAccountId) {
        setErrors({ to_account_id: "From and To accounts cannot be the same for a transfer." });
        setSubmitting(false);
        return;
      }
    }

    const formData = {
      user_id: userId,
      amount: parsedAmount,
      description: description.trim() || (type === 'transfer' ? 'Transfer' : description),
      type,
      category,
      transaction_date: transactionDate,
      account_id: accountId || null, // Ensure null if not selected
      to_account_id: type === 'transfer' ? (toAccountId || null) : null, // Ensure null if not selected or not a transfer
      notes: notes || undefined,
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '') : [],
      splits: isSplit ? splits : []
    };

    if (initialData && onUpdateTransaction) {
      try {
        const result = await onUpdateTransaction(initialData.id, formData as any);
        if (result.success) {
          if (onCancelEdit) onCancelEdit();
          onSuccess?.(); // Call onSuccess after successful update
        } else {
          setErrors({ api: result.error || "Update failed" });
        }
      } catch (err) {
        setErrors({ general: "Unexpected error during update" });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const validatedData = transactionSchema.omit({ receipt_url: true }).parse(formData);

      const result = await addTransaction(formData as any, file || undefined);

      if (result.success) {
        setAmount('');
        setDescription('');
        setFile(null);
        setNotes('');
        setIsSplit(false);
        setSplits([]);
        setTags('');
        setToAccountId('');
        setAccountId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSuccess?.(); // Call onSuccess after successful add
      } else {
        setErrors({ api: typeof result.error === 'string' ? result.error : "An unexpected error occurred." });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(issue => {
          if (issue.path.length > 0) {
            newErrors[issue.path[0]] = issue.message;
          }
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: "An unexpected error occurred during validation." });
        console.error("Validation error:", err);
      }
    } finally {
    setSubmitting(false);
    }
  };

  return (
    <section className={`bg-white dark:bg-black p-6 rounded-xl shadow-sm border transition-colors ${initialData ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-200 dark:border-gray-700 mb-8'}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{initialData ? 'Update Transaction' : 'Add New Transaction'}</h3>
          <button 
            type="submit" 
            disabled={submitting} 
            className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Transaction')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Transaction Type</label>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg transition-colors">
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${type === 'expense' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              Income
            </button>
            <button 
              type="button"
              onClick={() => { setType('transfer'); setCategory('Transfer'); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${type === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              Transfer
            </button>
          </div>
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="transaction-date" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Transaction Date</label>
          <input id="transaction-date" type="date" value={transactionDate} onChange={handleFieldChange(setTransactionDate, 'transaction_date')} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-colors" />
          {errors.transaction_date && <p className="text-red-500 text-xs mt-1">{errors.transaction_date}</p>}
        </div>
        <div className="lg:col-span-6">
          <div className="flex justify-between items-end mb-1">
            <label htmlFor="transaction-description" className="block text-xs font-semibold text-gray-500 uppercase">Description</label>
            {type === 'expense' && (
              <button 
                type="button" 
                onClick={() => { setIsSplit(!isSplit); if(!isSplit && splits.length === 0) handleAddSplit(); }}
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-all ${isSplit ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {isSplit ? '✓ Splitting Active' : '+ Split Category'}
              </button>
            )}
          </div>
          <input id="transaction-description" type="text" placeholder="e.g. Grocery Store" value={description} onChange={handleFieldChange(setDescription, 'description')} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-colors" />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>
        <div className={`lg:col-span-3 ${type === 'transfer' || isSplit ? 'opacity-40 pointer-events-none' : ''}`}>
          <label htmlFor="transaction-category" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
          <select id="transaction-category" value={category} onChange={handleFieldChange(setCategory, 'category')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors">
            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {errors.category && !isSplit && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="transaction-account" className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            {type === 'transfer' ? 'From Account' : 'Account'} 
          </label>
          <select id="transaction-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors">
            <option value="">No Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          {errors.account_id && <p className="text-red-500 text-xs mt-1">{errors.account_id}</p>}
        </div>
        {type === 'transfer' && (
          <div className="lg:col-span-3 animate-in slide-in-from-top-2">
            <label htmlFor="to-account" className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Account</label>
            <select id="to-account" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors">
              <option value="">Select Destination...</option>
              {accounts.filter(a => a.id !== accountId).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            {errors.to_account_id && <p className="text-red-500 text-xs mt-1">{errors.to_account_id}</p>}
          </div>
        )}
        <div className="lg:col-span-3">
          <label htmlFor="transaction-amount" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount ($)</label>
          <input id="transaction-amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={handleFieldChange(setAmount, 'amount')} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-colors" />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div className="lg:col-span-6">
          <label htmlFor="transaction-notes" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
          <input id="transaction-notes" type="text" placeholder="Additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:text-white transition-colors" />
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="transaction-tags" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags (comma separated)</label>
          <input id="transaction-tags" type="text" placeholder="e.g. tax, work" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:text-white transition-colors" />
        </div>

        {isSplit && (
          <div className="lg:col-span-12 bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Transaction Breakdown</span>
              <span className={`text-xs font-mono font-bold ${remainingToSplit === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                {remainingToSplit === 0 ? 'Perfectly Split ✓' : `Remaining: $${remainingToSplit}`}
              </span>
            </div>
            
            <div className="space-y-3">
              {splits.map((split, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <select 
                      value={split.category} 
                      onChange={(e) => updateSplit(idx, { category: e.target.value })}
                      className="w-full text-sm p-2 border rounded-lg dark:bg-gray-800 dark:text-white"
                    >
                      {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={split.amount} 
                      onChange={(e) => updateSplit(idx, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-full text-sm p-2 border rounded-lg dark:bg-gray-800 dark:text-white font-mono"
                    />
                  </div>
                  <div className="col-span-4">
                    <input 
                      type="text" 
                      placeholder="Split notes..." 
                      value={split.notes} 
                      onChange={(e) => updateSplit(idx, { notes: e.target.value })}
                      className="w-full text-sm p-2 border rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button type="button" onClick={() => setSplits(splits.filter((_, i) => i !== idx))} className="col-span-1 text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
              <button type="button" onClick={handleAddSplit} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2">+ Add Another Split</button>
            </div>
          </div>
        )}

        <div className="md:col-span-2 lg:col-span-3">
          <label htmlFor="transaction-receipt" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Receipt (Optional)</label>
          <div className="flex items-center gap-4">
            <input 
              id="transaction-receipt"
              ref={fileInputRef}
              type="file" 
              accept="image/*,application/pdf" 
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 cursor-pointer w-full transition-colors"
            />
            {file && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-left-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Selected:</span>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 truncate max-w-[150px]">{file.name}</span>
                <button 
                  type="button" 
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-indigo-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {errors.receipt_url && <p className="text-red-500 text-xs mt-1">{errors.receipt_url}</p>}
        </div>
        {initialData && (
          <div className="col-span-full lg:col-span-3">
             <button type="button" onClick={onCancelEdit} className="w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-lg hover:bg-gray-200 transition-colors">
               Cancel Edit
             </button>
          </div>
        )}
        {errors.general && <p className="text-red-500 text-xs mt-1 col-span-full font-bold">{errors.general}</p>}
        </div>
      </form>
    </section>
  );
};