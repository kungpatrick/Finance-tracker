import React from 'react';

export interface Goal {
  id: string;
  name: string;
  current_amount: number | null;
  target_amount: number;
  deadline?: string | null;
  has_transactions?: boolean;
}

interface SavingsGoalsProps {
  goals: Goal[];
  onAdd: () => void;
  onFund: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export const SavingsGoals: React.FC<SavingsGoalsProps> = ({ goals, onAdd, onFund, onEdit, onDelete }) => {
  return (
    <section className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Savings Goals</h3>
        <button
          onClick={onAdd}
          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-md transition-colors"
        >
          + Add Goal
        </button>
      </div>

      {goals.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 transition-colors">No goals set yet.</p>
      )}

      {goals.map(goal => {
        const current = goal.current_amount || 0;
        const progress = Math.min((current / goal.target_amount) * 100, 100);
        
        // Calculate required monthly contribution
        let monthlyRequired = null;
        if (goal.deadline && goal.target_amount > current) {
          // Append T00:00:00 to force local time parsing and avoid timezone shifts
          const deadline = new Date(goal.deadline + 'T00:00:00');
          const today = new Date();
          const diffMonths = (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth());
          
          if (diffMonths > 0) {
            monthlyRequired = (goal.target_amount - current) / diffMonths;
          } else if (deadline > today) {
            monthlyRequired = goal.target_amount - current; // Due this month
          }
        }

        return (
          <div key={goal.id} className="mb-5 last:mb-0 p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-neutral-900 transition-colors">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-bold text-gray-800 dark:text-white transition-colors">{goal.name}</span>
              <span className="text-gray-600 dark:text-gray-300 transition-colors">
                ${current.toLocaleString()} / ${goal.target_amount.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>
                {goal.deadline ? `Target: ${new Date(goal.deadline + 'T00:00:00').toLocaleDateString()}` : 'No deadline'}
              </span>
              {monthlyRequired && (
                <span className="font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded ml-2">
                  Save ${monthlyRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                </span>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => onFund(goal)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-2 py-1 rounded-md border border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  Fund
                </button>
                <button onClick={() => onEdit(goal)} className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
                  Edit
                </button>
                <button onClick={() => onDelete(goal.id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-md hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};