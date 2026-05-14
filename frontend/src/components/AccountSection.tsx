import React, { useMemo } from 'react';
import { Account } from '../hooks/useAccounts';
import { RecurringRule } from '../hooks/useRecurringRules';

interface AccountSectionProps {
  accounts: Account[];
  rules: RecurringRule[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  showCleared?: boolean;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ 
  accounts, 
  rules, 
  selectedAccountId, 
  onSelectAccount, 
  onAddAccount, 
  onEditAccount,
  onDeleteAccount 
}) => {
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  const formatBalance = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {accounts.map(acc => {
        // Calculate Forecast: Current Balance + Unprocessed Recurring items for THIS account
        const pendingTotal = rules
          .filter(r => r.last_processed_month !== currentMonth && r.account_id === acc.id)
          .reduce((sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount), 0);
        
        const forecast = acc.balance + pendingTotal;

        return (
          <div 
            key={acc.id} 
            onClick={() => onSelectAccount(selectedAccountId === acc.id ? 'All' : acc.id)}
            className={`bg-white dark:bg-neutral-900 p-4 rounded-xl border-2 shadow-sm cursor-pointer transition-all group relative ${
              selectedAccountId === acc.id 
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md scale-[1.02]' 
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{acc.type}</div>
              <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                {acc.institution || 'Bank'}
              </div>
            </div>
            <div className="text-sm font-bold text-gray-700 dark:text-white truncate pr-4">{acc.name}</div>
            
            <div className="mt-2">
              <div className={`text-lg font-mono font-bold ${acc.type === 'credit' ? 'text-red-500' : 'text-indigo-600'}`}>
                {formatBalance(acc.balance, acc.currency)}
              </div>
              {acc.balance !== (acc as any).cleared_balance && (
                <div className="text-[10px] text-gray-400 font-medium">
                  Cleared: {formatBalance((acc as any).cleared_balance || 0, acc.currency)}
                </div>
              )}
              <div className="flex justify-between items-center mt-1 border-t border-gray-50 dark:border-gray-800 pt-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Forecast:</span>
                <span className={`text-[10px] font-mono font-bold ${forecast >= acc.balance ? 'text-green-500' : 'text-orange-500'}`}>
                  {formatBalance(forecast, acc.currency)}
                </span>
              </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onEditAccount(acc); }}
                className="p-1 text-gray-300 hover:text-indigo-500 transition-colors"
                title="Edit Account"
              >✏️</button>
              <button 
                onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this account? All associated transactions will lose their account link. Continue?')) onDeleteAccount(acc.id); }}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors" // Added title for accessibility
                title="Delete Account"
              >✕</button>
            </div>
          </div>
        );
      })}
      
      <button 
        onClick={onAddAccount}
        className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-400 transition-all group"
      >
        <span className="text-xl group-hover:scale-125 transition-transform">+</span>
        <span className="text-xs font-bold uppercase tracking-wider">Add Account</span>
      </button>
    </div>
  );
};