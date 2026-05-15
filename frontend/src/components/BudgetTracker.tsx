import React, { useState } from 'react';
import { Budget } from '../hooks/useBudgets';
import { Transaction } from '../hooks/useTransactions';

interface BudgetTrackerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpsertBudget: (category: string, limit: number) => Promise<any>;
  categories: readonly string[];
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ 
  budgets, 
  transactions, 
  onUpsertBudget,
  categories 
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const spendingByCategory = transactions.reduce((acc, t) => {
    // Only sum transactions tagged as 'expense' for budget tracking
    if (t.type === 'expense') {
      acc[t.category as string] = (acc[t.category as string] || 0) + (Number(t.amount) || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = categories.reduce((acc, cat) => acc + (spendingByCategory[cat] || 0), 0);
  const totalPercentage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
  const isTotalOver = totalSpent > totalBudgeted && totalBudgeted > 0;

  const handleSave = async (category: string) => {
    setError(null);
    const limit = parseFloat(limitInput);
    if (isNaN(limit) || limit < 0) {
      setError("Please enter a valid non-negative number.");
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

  return (
    <section className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Category Budgets</h3>
        <div className="text-right transition-colors">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Utilization</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-extrabold ${isTotalOver ? 'text-red-600' : 'text-indigo-600'}`}>
              ${totalSpent.toLocaleString()} / ${totalBudgeted.toLocaleString()}
            </span>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isTotalOver ? 'bg-red-500' : 'bg-indigo-500'} dark:bg-indigo-400`} 
                style={{ width: `${totalPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-2 text-xs bg-red-50 text-red-600 border border-red-100 rounded">
          {error}
        </div>
      )}
      <div className="max-h-[330px] overflow-y-auto pr-2"> {/* Adjusted max-height to show exactly 3 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories
            .filter(cat => {
              // Exclude non-budgetable system categories
              if (cat === 'Savings' || cat === 'Transfer') return false;

              const spent = spendingByCategory[cat] || 0;
              const hasBudget = budgets.some(b => b.category === cat && b.limit_amount > 0);
              // Show if there is actual expense spending, an existing budget, 
              // or if it's a custom/defined category (allowing users to set budgets for new categories)
              const isDefined = categories.includes(cat);
              return spent > 0 || hasBudget || isDefined;
            })
            .map(category => {
            const budget = budgets.find(b => b.category === category);
            const limit = budget?.limit_amount || 0;
            const spent = spendingByCategory[category] || 0;
            const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const isOver = spent > limit && limit > 0;

            return (
              <div key={category} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700 dark:text-white transition-colors">{category}</span>
                  {editingCategory === category ? (
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={limitInput} 
                        onChange={(e) => setLimitInput(e.target.value)} 
                        aria-label={`Set budget limit for ${category}`}
                        className="w-24 p-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-600 dark:border-gray-500 dark:text-white transition-colors"
                      />
                      <button onClick={() => handleSave(category)} className="text-green-600 text-xs font-bold uppercase hover:text-green-700">Save</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingCategory(category); setLimitInput(limit.toString()); }}
                      className="text-indigo-600 text-xs font-bold uppercase hover:underline"
                    >
                      {limit > 0 ? `Limit: $${limit.toLocaleString()}` : 'Set Limit'}
                    </button>
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
      </div>
    </section>
  );
};