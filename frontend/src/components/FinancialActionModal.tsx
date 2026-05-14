import React, { useState, useEffect, useMemo } from 'react';
import { Account } from '../hooks/useAccounts';

export type ActionType = 'ADD_GOAL' | 'FUND_GOAL' | 'ADD_DEBT' | 'PAY_DEBT' | 'EDIT_GOAL' | 'EDIT_DEBT' | 'OPTIMIZE_BUDGET';

interface FinancialActionModalProps {
  type: ActionType;
  title: string;
  contextName?: string;
  initialData?: any;
  onClose: () => void;
  accounts?: Account[]; // Add accounts prop
  isLocked?: boolean;
  onConfirm: (data: any) => void;
}

// Helper function for amortization calculation
const calculateMonthlyPayment = (principal: number, annualRate: number, numPayments: number): number | null => {
  if (numPayments <= 0) return null; // Cannot have 0 or negative payments
  if (principal <= 0) return 0; // No principal, no payment

  if (annualRate === 0) return principal / numPayments;

  const monthlyRate = annualRate / 12 / 100;
  // Handle very small monthlyRate to prevent division by zero or near-zero issues
  if (monthlyRate === 0) return principal / numPayments;

  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // If payment is less than monthly interest, it's an impossible payoff
  if (payment < principal * monthlyRate) return null;
  
  return isNaN(payment) || !isFinite(payment) ? null : payment;
};

// Helper function to calculate number of payments given principal, rate, and payment
const calculateNumPayments = (principal: number, annualRate: number, monthlyPayment: number): number | null => {
  if (monthlyPayment <= 0) return null; // Will never pay off
  if (principal <= 0) return 0; // Already paid off

  if (annualRate === 0) {
    const num = principal / monthlyPayment;
    return num > 0 ? Math.ceil(num) : 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  // Handle very small monthlyRate to prevent division by zero or near-zero issues
  if (monthlyRate === 0) return principal / monthlyPayment;

  if (monthlyPayment <= principal * monthlyRate) return null; // Payment doesn't cover interest

  const numPayments = -Math.log(1 - (monthlyRate * principal) / monthlyPayment) / Math.log(1 + monthlyRate);
  return isNaN(numPayments) || !isFinite(numPayments) ? null : Math.ceil(numPayments);
};


export const FinancialActionModal: React.FC<FinancialActionModalProps> = ({
  type,
  title,
  contextName,
  initialData,
  onClose,
  accounts = [], // Destructure accounts with a default empty array
  isLocked = false,
  onConfirm,
}) => {
  // Ensure formData is initialized and synchronized with initialData
  const [formData, setFormData] = useState<any>(initialData || {}); // Stores name, total_amount, remaining_amount, interest_rate
  const [numberOfPayments, setNumberOfPayments] = useState<number | ''>('');

  // Effect to sync formData if initialData changes (e.g., switching between different goals)
  useEffect(() => {
    setFormData(initialData || {});
    // For editing debt, if min_payment exists, try to derive numberOfPayments
    if ((type === 'EDIT_DEBT' || type === 'ADD_DEBT') && initialData?.min_payment && initialData?.remaining_amount && initialData?.interest_rate !== null) {
      const num = calculateNumPayments(
        initialData.remaining_amount,
        initialData.interest_rate,
        initialData.min_payment
      );
      setNumberOfPayments(num !== null && isFinite(num) ? num : '');
    } else {
      setNumberOfPayments('');
    }
  }, [initialData]);

  const calculatedMinPayment = useMemo(() => {
    const principal = formData.remaining_amount || formData.total_amount || 0;
    const annualRate = formData.interest_rate || 0;
    const numPayments = typeof numberOfPayments === 'number' && numberOfPayments > 0 ? numberOfPayments : 0;
    return principal > 0 && numPayments > 0 ? calculateMonthlyPayment(principal, annualRate, numPayments) : null;
  }, [formData.remaining_amount, formData.total_amount, formData.interest_rate, numberOfPayments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: inputType === 'number' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToConfirm = { ...formData };

    if (type === 'ADD_DEBT' || type === 'EDIT_DEBT') {
      if (calculatedMinPayment !== null) {
        dataToConfirm.min_payment = calculatedMinPayment;
      } else {
        // Fallback to 0 if calculation is impossible
        dataToConfirm.min_payment = 0;
      }
    }

    onConfirm(dataToConfirm);
  };

  // Validation logic to disable the confirm button if inputs are invalid
  const isConfirmDisabled = useMemo(() => {
    if (type === 'ADD_DEBT' || type === 'EDIT_DEBT') {
      const principal = formData.remaining_amount || formData.total_amount || 0;
      const annualRate = formData.interest_rate || 0;
      const numPayments = typeof numberOfPayments === 'number' && numberOfPayments > 0 ? numberOfPayments : 0;

      if (!formData.name || formData.name.trim() === '') return true;
      if (principal <= 0) return true;
      if (annualRate < 0) return true;
      if (numPayments === 0 || calculatedMinPayment === null) return true;
    }

    if (type === 'ADD_GOAL' || type === 'EDIT_GOAL') {
      if (!formData.name || formData.name.trim() === '') return true;
      if ((formData.target_amount || 0) <= 0) return true;
    }

    if ((type === 'FUND_GOAL' || type === 'PAY_DEBT') && (!formData.amount || !formData.account_id)) return true;

    return false;
  }, [type, formData, numberOfPayments, calculatedMinPayment]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[1200] p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 transition-colors">{title}</h3>
        {contextName && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors">Target: {contextName}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'OPTIMIZE_BUDGET' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 italic mb-2">
                  AI Suggestion: You are consistently under budget in other categories. Re-allocating $200 here will balance your monthly cash flow.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-400">{contextName} (Current)</span>
                    <span className="text-red-500">${initialData.limit_amount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-400">Target Adjustment</span>
                    <span className="text-green-500">-$200.00</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Budget Limit ($)</label>
                <input 
                  required 
                  name="amount" 
                  type="number" 
                  value={formData.amount || initialData.limit_amount - 200}
                  aria-label="New Budget Limit"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
          {(type === 'ADD_GOAL' || type === 'ADD_DEBT' || type === 'EDIT_GOAL' || type === 'EDIT_DEBT') && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Name</label>
              <input 
                required 
                name="name" 
                type="text" 
                value={formData.name || ''}
                aria-label="Name"
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
              />
            </div>
          )}

          {(type === 'ADD_GOAL' || type === 'EDIT_GOAL') && ( // This block handles goal-specific fields
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Target Amount ($)</label>
                <input 
                  required 
                  name="target_amount" 
                  type="number" 
                  step="0.01" 
                  aria-label="Target Amount"
                  value={formData.target_amount ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                />
              </div>
              {(type === 'ADD_GOAL' || type === 'EDIT_GOAL') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Current Amount ($)</label>
                  <input
                    name="current_amount"
                    type="number"
                    step="0.01"
                    disabled={isLocked && type === 'EDIT_GOAL'} // Disable only if transactions exist
                    aria-label="Current Amount"
                    value={formData.current_amount ?? ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Deadline</label>
                <input
                  name="deadline"
                  type="date"
                  aria-label="Deadline"
                  value={formData.deadline || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                />
              </div>
            </>
          )}

          {(type === 'FUND_GOAL' || type === 'PAY_DEBT') && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Amount ($)</label>
              <input 
                required 
                name="amount" 
                type="number" 
                step="0.01" 
                aria-label="Amount"
                value={formData.amount || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
              />
            </div>
          )}

          {(type === 'FUND_GOAL' || type === 'PAY_DEBT') && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">{type === 'FUND_GOAL' ? 'From Account' : 'Payment Account'}</label>
              <select
                required
                name="account_id"
                value={formData.account_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
              >
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.institution})</option>
                ))}
              </select>
            </div>
          )}

          {(type === 'ADD_DEBT' || type === 'EDIT_DEBT') && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Total Amount ($)</label>
                <input
                  required
                  name="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                  aria-label="Total Amount"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Remaining Amount ($)</label>
                <input
                  required
                  name="remaining_amount"
                  type="number"
                  step="0.01"
                  disabled={isLocked && type === 'EDIT_DEBT'} // Disable only if transactions exist
                  value={formData.remaining_amount ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                  aria-label="Remaining Amount"
                />
              </div>
              <div className="grid grid-cols-2 gap-4"> {/* Added aria-label to inputs */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors">Interest Rate (%)</label>
                  <input name="interest_rate" type="number" step="0.1" value={formData.interest_rate || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors" aria-label="Interest Rate" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 transition-colors"># of Monthly Payments</label>
                  <input
                    name="numberOfPayments"
                    type="number"
                    step="1"
                    min="1"
                    value={numberOfPayments}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      // Ensure only positive integers are stored in state
                      setNumberOfPayments(isNaN(val) || val < 1 ? '' : val);
                    }}
                    onKeyDown={(e) => {
                      // Block non-integer characters at the keyboard level
                      if (['.', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault();
                    }}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    aria-label="Number of Monthly Payments"
                  />
                </div>
              </div>
              {calculatedMinPayment !== null && (
                <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
                  Calculated Monthly Payment: <span className="font-bold">${calculatedMinPayment.toFixed(2)}</span>
                </div>
              )}
              {calculatedMinPayment === null && numberOfPayments !== '' && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  <span className="font-bold">Warning:</span> With these inputs, the debt may never be paid off (payment too low or impossible).
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isConfirmDisabled}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-bold shadow-md"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};