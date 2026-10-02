import React, { useState, useMemo } from 'react';
import { Budget } from '../hooks/useBudgets';
import { Transaction } from '../hooks/useTransactions';

interface BudgetTrackerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpsertBudget: (category: string, limit: number) => Promise<any>;
  onDeleteBudget?: (category: string, id?: string) => Promise<any>;
  categories: readonly string[];
  allCategories?: readonly string[];
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ 
  budgets, 
  transactions, 
  onUpsertBudget,
  onDeleteBudget,
  categories,
  allCategories = []
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Add Budget State
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const spendingByCategory = useMemo(() => {
    return transactions.reduce((acc, t) => {
      // Only sum transactions tagged as 'expense' for budget tracking
      if (t.type === 'expense') {
        acc[t.category as string] = (acc[t.category as string] || 0) + (Number(t.amount) || 0);
      }
      return acc;
    }, {} as Record<string, number>);
  }, [transactions]);

  // Determine active displayed categories:
  // Show categories that have active spending in this period OR have an active budget limit set (> 0)
  const displayedCategories = useMemo(() => {
    const allKnown = new Set([
      ...categories,
      ...budgets.map(b => b.category),
      ...Object.keys(spendingByCategory)
    ]);

    return Array.from(allKnown)
      .filter(cat => {
        // Exclude system non-budgetable categories
        if (cat === 'Savings' || cat === 'Transfer') return false;

        const spent = spendingByCategory[cat] || 0;
        const hasBudget = budgets.some(b => 
          b.category.trim().toLowerCase() === cat.trim().toLowerCase() && Number(b.limit_amount) > 0
        );
        // Only show if there is actual expense spending OR an active budget exists
        return spent > 0 || hasBudget;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [categories, budgets, spendingByCategory]);

  // Categories available to add a new budget for (categories without active budget)
  const availableCategoriesToAdd = useMemo(() => {
    const activeBudgetCategories = new Set(
      budgets
        .filter(b => Number(b.limit_amount) > 0)
        .map(b => b.category.trim().toLowerCase())
    );
    const source = allCategories.length > 0 ? allCategories : categories;
    return Array.from(new Set(source))
      .filter(cat => cat !== 'Savings' && cat !== 'Transfer' && !activeBudgetCategories.has(cat.trim().toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }, [allCategories, categories, budgets]);

  const totalBudgeted = budgets.reduce((acc, b) => acc + (b.limit_amount > 0 ? b.limit_amount : 0), 0);
  
  // Total spent across all expense categories (excluding system categories)
  const allExpenseCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...Object.keys(spendingByCategory)]))
      .filter(c => c !== 'Savings' && c !== 'Transfer');
  }, [categories, spendingByCategory]);

  const totalSpent = allExpenseCategories.reduce((acc, cat) => acc + (spendingByCategory[cat] || 0), 0);
  const totalPercentage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
  const isTotalOver = totalSpent > totalBudgeted && totalBudgeted > 0;

  const handleSave = async (category: string) => {
    setError(null);
    const limit = parseFloat(limitInput);
    if (isNaN(limit) || limit < 0) {
      setError("Please enter a valid non-negative number.");
      return;
    }
    
    if (limit === 0) {
      await handleDelete(category);
      return;
    }

    const { success, error: apiError } = await onUpsertBudget(category, limit);
    if (success) {
      setEditingCategory(null);
      setLimitInput('');
    } else {
      setError(apiError || "Failed to save budget.");
    }
  };

  const handleDelete = async (category: string) => {
    setError(null);
    const spent = spendingByCategory[category] || 0;
    const confirmMessage = spent > 0 
      ? `"${category}" currently has $${spent.toLocaleString()} spent in this period. Are you sure you want to remove its budget limit?`
      : `Are you sure you want to remove the budget for "${category}"?`;

    if (!window.confirm(confirmMessage)) return;

    const budget = budgets.find(b => b.category.trim().toLowerCase() === category.trim().toLowerCase());

    if (onDeleteBudget) {
      const res = await onDeleteBudget(category, budget?.id);
      if (res?.success) {
        if (editingCategory === category) {
          setEditingCategory(null);
          setLimitInput('');
        }
      } else {
        setError(res?.error || "Failed to remove budget.");
      }
    } else {
      const res = await onUpsertBudget(category, 0);
      if (res?.success) {
        if (editingCategory === category) {
          setEditingCategory(null);
          setLimitInput('');
        }
      } else {
        setError(res?.error || "Failed to remove budget.");
      }
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const categoryName = isCustomCategory ? customCategoryInput.trim() : newCategory.trim();
    if (!categoryName) {
      setError("Please select or enter a category name.");
      return;
    }
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) {
      setError("Please enter a valid budget limit greater than 0.");
      return;
    }

    setSubmittingAdd(true);
    const { success, error: apiError } = await onUpsertBudget(categoryName, limit);
    setSubmittingAdd(false);

    if (success) {
      setIsAdding(false);
      setNewCategory('');
      setCustomCategoryInput('');
      setIsCustomCategory(false);
      setNewLimit('');
    } else {
      setError(apiError || "Failed to add budget.");
    }
  };

  return (
    <section className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Category Budgets</h3>
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setError(null);
            }}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg transition-colors"
          >
            <span>{isAdding ? '✕' : '+'}</span> {isAdding ? 'Cancel' : 'Add Budget'}
          </button>
        </div>
        <div className="text-right transition-colors">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Utilization</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-extrabold ${isTotalOver ? 'text-red-600' : 'text-indigo-600'}`}>
              ${totalSpent.toLocaleString()} / ${totalBudgeted.toLocaleString()}
            </span>
            <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isTotalOver ? 'bg-red-500' : 'bg-indigo-500'} dark:bg-indigo-400`} 
                style={{ width: `${totalPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 text-xs bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded">
          {error}
        </div>
      )}

      {/* Inline Add Budget Form */}
      {isAdding && (
        <form onSubmit={handleAddBudget} className="mb-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-wrap items-end gap-3 transition-colors">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Category</label>
            {!isCustomCategory ? (
              <select 
                value={newCategory} 
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomCategory(true);
                    setNewCategory('');
                  } else {
                    setNewCategory(e.target.value);
                  }
                }}
                className="w-full p-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">Select Category...</option>
                {availableCategoriesToAdd.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">+ Enter custom category...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Category Name"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="flex-1 p-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setIsCustomCategory(false); setCustomCategoryInput(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2"
                >
                  Back to list
                </button>
              </div>
            )}
          </div>
          <div className="w-36">
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Limit ($)</label>
            <input 
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 500"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-full p-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="submit" 
              disabled={submittingAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {submittingAdd ? 'Saving...' : 'Save Budget'}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setNewCategory(''); setCustomCategoryInput(''); setIsCustomCategory(false); setNewLimit(''); }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="max-h-[330px] overflow-y-auto pr-2">
        {displayedCategories.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 italic">
            No category budgets or expenses recorded yet. Click "+ Add Budget" above to set a budget.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedCategories.map(category => {
              const budget = budgets.find(b => b.category.trim().toLowerCase() === category.trim().toLowerCase());
              const limit = budget?.limit_amount || 0;
              const spent = spendingByCategory[category] || 0;
              const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const isOver = spent > limit && limit > 0;

              return (
                <div key={category} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-700 dark:text-white transition-colors">{category}</span>
                    {editingCategory === category ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="number" 
                          value={limitInput} 
                          onChange={(e) => setLimitInput(e.target.value)} 
                          aria-label={`Set budget limit for ${category}`}
                          className="w-24 p-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-600 dark:border-gray-500 dark:text-white transition-colors"
                        />
                        <button 
                          onClick={() => handleSave(category)} 
                          className="text-green-600 dark:text-green-400 text-xs font-bold uppercase hover:text-green-700 dark:hover:text-green-300"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => { setEditingCategory(null); setLimitInput(''); }} 
                          className="text-gray-400 text-xs font-bold uppercase hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                        {limit > 0 && (
                          <button 
                            onClick={() => handleDelete(category)} 
                            className="text-red-500 text-xs font-bold uppercase hover:text-red-700 dark:hover:text-red-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setEditingCategory(category); setLimitInput(limit.toString()); }}
                          className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase hover:underline"
                        >
                          {limit > 0 ? `Limit: $${limit.toLocaleString()}` : 'Set Limit'}
                        </button>
                        {limit > 0 && (
                          <button 
                            onClick={() => handleDelete(category)}
                            title={`Remove ${category} budget`}
                            aria-label={`Remove ${category} budget`}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                    <span className="transition-colors">Spent: ${spent.toLocaleString()}</span>
                    {limit > 0 ? (
                      <span className={isOver ? 'text-red-600 font-bold' : ''}>
                        {percentage.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="italic opacity-50 text-[10px] dark:text-gray-500 transition-colors">No Limit</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden transition-colors">
                    <div 
                      className={`h-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{ width: `${percentage}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};