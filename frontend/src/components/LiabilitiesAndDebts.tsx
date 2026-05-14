import React from 'react';

export interface Debt {
  id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number | null;
  min_payment: number | null;
  has_transactions?: boolean;
}

interface LiabilitiesAndDebtsProps {
  debts: Debt[];
  onAdd: () => void;
  onPay: (id: string) => void;
  onViewAmortization: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

export const LiabilitiesAndDebts: React.FC<LiabilitiesAndDebtsProps> = ({ 
  debts, 
  onAdd, 
  onPay, 
  onViewAmortization, 
  onEdit, 
  onDelete 
}) => {
  return (
    <section className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Liabilities & Debts</h3>
        <button 
          onClick={onAdd}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-md transition-colors"
        >
          + Add Debt
        </button>
      </div>

      {debts.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 transition-colors">No debts recorded yet.</p>
      )}

      {debts.map(debt => {
        const progress = Math.min(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100, 100);
        return (
          <div key={debt.id} className="mb-5 last:mb-0 p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-neutral-900 transition-colors">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-bold text-gray-800 dark:text-white transition-colors">{debt.name}</span>
              <span className="text-gray-600 dark:text-gray-300 transition-colors">
                ${debt.remaining_amount.toLocaleString()} / ${debt.total_amount.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 transition-colors">
              <span>
                APR: {debt.interest_rate || 0}% | 
                Min. Payment: ${(debt.min_payment || 0).toFixed(2)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => onPay(debt.id)} className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded-md border border-red-300 hover:bg-red-50 transition-colors">
                  Pay
                </button>
                <button onClick={() => onViewAmortization(debt)} className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
                  Chart
                </button>
                <button onClick={() => onEdit(debt)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:bg-gray-600 text-xs px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Edit
                </button>
                <button onClick={() => onDelete(debt.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:bg-red-900 text-xs px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-800 transition-colors">
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