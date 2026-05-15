import React, { useState, useEffect } from 'react'; // Added useEffect
import { useTransactionRules, TransactionRule } from '../hooks/useTransactionRules'; 
import { Transaction } from '../hooks/useTransactions';

interface TransactionRulesModalProps {
  categories: string[];
  transactions?: Transaction[];
  onUpdateTransaction?: (id: string, updates: any) => Promise<any>;
  onClose: () => void;
}

export const TransactionRulesModal: React.FC<TransactionRulesModalProps> = ({ categories, transactions = [], onUpdateTransaction, onClose }) => {
  const { rules, addRule, updateRule, deleteRule, applyRules, loading } = useTransactionRules();
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('');
  const [alias, setAlias] = useState('');
  const [tags, setTags] = useState('');
  const [editingRule, setEditingRule] = useState<TransactionRule | null>(null); // New state for editing
  const [isProcessingHistory, setIsProcessingHistory] = useState(false);

  // Effect to populate form when editingRule changes
  useEffect(() => {
    if (editingRule) {
      setPattern(editingRule.description_pattern);
      setCategory(editingRule.auto_category || '');
      setAlias(editingRule.alias_name || '');
      setTags(editingRule.auto_tags?.join(', ') || '');
    } else {
      // Clear form when not editing
      setPattern('');
      setCategory('');
      setAlias('');
      setTags('');
    }
  }, [editingRule]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) return;

    const ruleData = {
      description_pattern: pattern.trim(),
      auto_category: category || null,
      alias_name: alias.trim() || null,
      auto_tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [],
      is_active: true
    };

    const { success } = editingRule 
      ? await updateRule(editingRule.id, ruleData) 
      : await addRule(ruleData);

    if (success) {
      setEditingRule(null); // Clear editing state
      // Form fields are cleared by the useEffect when editingRule becomes null
    }
  };

  const handleEditClick = (rule: TransactionRule) => {
    setEditingRule(rule);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
  };

  const handleRunOnHistory = async () => {
    if (!onUpdateTransaction || transactions.length === 0) return;
    if (!window.confirm(`Scan ${transactions.length} transactions and apply active rules? This will update descriptions and categories based on your rules.`)) return;
    
    setIsProcessingHistory(true);
    let updateCount = 0;

    for (const t of transactions) {
      // Prepare a clean update object for all system-driven updates
      const cleanUpdate = {
        description: t.description,
        amount: t.amount,
        category: t.category,
        type: t.type,
        transaction_date: t.transaction_date.split('T')[0],
        user_id: t.user_id,
        account_id: t.account_id,
        to_account_id: t.to_account_id,
        notes: t.notes,
        tags: t.tags || [],
        splits: t.splits || [],
        debt_id: t.debt_id,
        goal_id: t.goal_id,
        recurring_rule_id: t.recurring_rule_id
      };

      // Fix/Restore categorization for system-linked transactions (Debts and Goals)
      if (t.debt_id && t.category !== 'Debts') {
        await onUpdateTransaction(t.id, { ...cleanUpdate, category: 'Debts' });
        updateCount++;
        continue;
      }

      if (t.goal_id && t.category !== 'Savings') {
        await onUpdateTransaction(t.id, { ...cleanUpdate, category: 'Savings' });
        updateCount++;
        continue;
      }

      // Protect system transactions (Debt payments and Goal funding) from automation rules
      if (t.debt_id || t.goal_id) continue;

      const suggestion = applyRules(t.description);
      if (suggestion) {
        // Construct a clean update object containing only the fields the backend expects
        const updates: any = {
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          transaction_date: t.transaction_date.split('T')[0], // Ensure YYYY-MM-DD format
          user_id: t.user_id,
          account_id: t.account_id,
          to_account_id: t.to_account_id,
          notes: t.notes,
          tags: t.tags || [],
          splits: t.splits || [],
          debt_id: t.debt_id,
          goal_id: t.goal_id,
          recurring_rule_id: t.recurring_rule_id
        };
        
        let hasChanges = false;

        if (suggestion.alias && suggestion.alias !== t.description) {
          updates.description = suggestion.alias;
          hasChanges = true;
        }
        // Protect system-critical categories (Debts and Savings) from being overwritten by general rules
        const isSystemCategory = t.category === 'Debts' || t.category === 'Savings';
        if (suggestion.category && suggestion.category !== t.category && !isSystemCategory) {
          updates.category = suggestion.category;
          hasChanges = true;
        }
        if (suggestion.tags.length > 0) {
          const mergedTags = Array.from(new Set([...(t.tags || []), ...suggestion.tags]));
          if (mergedTags.length !== (t.tags?.length || 0)) {
            updates.tags = mergedTags;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await onUpdateTransaction(t.id, updates);
          updateCount++;
        }
      }
    }

    alert(`Success! Rules applied to ${updateCount} transactions.`);
    setIsProcessingHistory(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1700] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-2xl relative border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{editingRule ? 'Update Automation Rule' : 'Automation Rules'}</h3>
        <p className="text-sm text-gray-500 mb-6">{editingRule ? 'Edit an existing rule.' : 'Automatically categorize transactions based on keywords.'}</p>

        <form onSubmit={handleSave} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">If Description Contains</label>
            <input required value={pattern} onChange={e => setPattern(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white text-sm" placeholder="e.g. Starbucks" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rename To (Alias)</label>
            <input value={alias} onChange={e => setAlias(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white text-sm" placeholder="e.g. Starbucks" /> 
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Set Category To</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white text-sm">
              <option value="">No Change</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Apply Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white text-sm" placeholder="e.g. coffee, break" />
          </div>
          <div className="md:col-span-3 flex gap-2">
            {editingRule && (
              <button type="button" onClick={handleCancelEdit} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-all text-sm">
                Cancel Edit
              </button>
            )}
            <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-sm">
              {editingRule ? 'Save Changes' : '+ Create Rule'}
            </button>
          </div>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Active Rules</h4>
            <button 
              onClick={handleRunOnHistory}
              disabled={isProcessingHistory || rules.length === 0}
              className="text-[10px] font-black uppercase px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full hover:bg-amber-100 transition-all disabled:opacity-50"
            >
              {isProcessingHistory ? '✨ Processing...' : '⚡ Apply Rules to History'}
            </button>
          </div>

          {loading ? (
            <p className="text-center py-4 text-gray-400">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="text-center py-4 text-gray-400 italic">No automation rules defined yet.</p>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-700 dark:text-white">"{rule.description_pattern}"</div>
                <div className="flex items-center gap-2 mt-1">
                  {rule.alias_name && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">Rename → {rule.alias_name}</span>
                  )}
                  {rule.auto_category && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">→ {rule.auto_category}</span>
                  )}
                  {rule.auto_tags.map(t => (
                    <span key={t} className="text-[10px] text-gray-400">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditClick(rule)} className="text-gray-400 hover:text-indigo-500 p-2" title="Edit Rule">
                  ✏️
                </button>
                <button onClick={() => deleteRule(rule.id)} className="text-gray-400 hover:text-red-500 p-2" title="Delete Rule">
                  🗑️
                </button>
              </div>
            </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-lg">Done</button>
        </div>
      </div>
    </div>
  );
};