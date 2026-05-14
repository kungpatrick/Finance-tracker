import React, { useState } from 'react';
import { useRecurringRules } from '../hooks/useRecurringRules';
import { Account } from '../hooks/useAccounts';

interface RecurringRulesModalProps {
  categories: string[];
  accounts: Account[];
  onClose: () => void;
}

export const RecurringRulesModal: React.FC<RecurringRulesModalProps> = ({ categories, accounts, onClose }) => {
  const { rules, addRule, deleteRule, loading } = useRecurringRules();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const success = await addRule({
      description,
      amount: val,
      category,
      type,
      account_id: accountId || null,
      day_of_month: parseInt(dayOfMonth),
    });

    if (success) {
      setDescription('');
      setAmount('');
      setAccountId('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1400] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-200 dark:border-gray-700 transition-colors">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
        
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Manage Recurring Bills & Income</h3>

        <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-black p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Added aria-label to inputs */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
            <input required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. Monthly Rent" aria-label="Description" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount ($)</label>
            <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" aria-label="Amount" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Day of Month (1-31)</label>
            <input required type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" aria-label="Day of Month" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pay From / To</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="">No Specific Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all">
              + Add Recurring Rule
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Active Rules</h4>
          {loading ? (
            <p className="text-center py-4 text-gray-400">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="text-center py-4 text-gray-400 italic">No recurring rules defined yet.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">{rule.description}</div>
                  <div className="text-xs text-gray-500">
                    {rule.type.toUpperCase()} • {rule.category} • Day {rule.day_of_month} of month
                    {rule.account_id && ` • ${accounts.find(a => a.id === rule.account_id)?.name}`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`font-mono font-bold ${rule.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {rule.type === 'income' ? '+' : '-'}${rule.amount.toLocaleString()}
                  </div>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove Rule"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};