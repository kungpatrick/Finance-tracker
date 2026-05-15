import React, { useState } from 'react';
import { Transaction } from '../hooks/useTransactions';
import { Account } from '../hooks/useAccounts';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: Account[];
  sortConfig: { key: keyof Transaction; direction: 'asc' | 'desc' } | null;
  categories: string[];
  onSort: (key: keyof Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDuplicate: (t: Transaction) => void;
  onDelete: (t: Transaction) => void; // Change to pass full transaction
  onUpdateStatus: (id: string, is_reconciled: boolean) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusUpdate: (ids: string[], is_reconciled: boolean) => void;
  onViewReceipt: (url: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = (props) => {
  const { transactions, accounts, sortConfig, categories, onSort, onEdit, onDuplicate, onDelete, onUpdateStatus, onBulkDelete, onBulkStatusUpdate, onViewReceipt } = props;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(transactions.map(t => t.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-indigo-600 rounded-xl shadow-lg animate-in slide-in-from-top-4 print:hidden">
          <div className="flex items-center gap-4 px-2">
            <span className="text-white text-sm font-bold">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-indigo-400" />
            <button 
              onClick={() => { onBulkStatusUpdate(Array.from(selectedIds), true); setSelectedIds(new Set()); }}
              className="text-white text-xs font-bold uppercase hover:text-indigo-200 transition-colors"
            >
              Mark Cleared
            </button>
            <button 
              onClick={() => { onBulkStatusUpdate(Array.from(selectedIds), false); setSelectedIds(new Set()); }}
              className="text-white text-xs font-bold uppercase hover:text-indigo-200 transition-colors"
            >
              Mark Pending
            </button>
          </div>
          <button 
            onClick={() => { if(window.confirm(`Delete ${selectedIds.size} transactions?`)) { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); } }}
            className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Selected
          </button>
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black shadow-sm transition-colors print:max-h-none print:border-none">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b-2 border-gray-200 dark:border-gray-700 sticky top-0 bg-gray-50 dark:bg-neutral-900 z-10 print:static">
            <th className="p-4 w-10 print:hidden">
              <input type="checkbox" checked={selectedIds.size === transactions.length && transactions.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            </th>
            <th className="p-4 w-10 print:hidden"></th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => onSort('transaction_date')}>
              Date {sortConfig?.key === 'transaction_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Account</th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => onSort('amount')}>
              Amount {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {transactions.map(t => {
            const isExpanded = expandedId === t.id;
            const hasExtraInfo = (t.notes || (t.tags && t.tags.length > 0) || (t.splits && Array.isArray(t.splits) && t.splits.length > 0));

            return (
            <React.Fragment key={t.id}>
            <tr className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group ${selectedIds.has(t.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
              <td className="p-4 print:hidden">
                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              </td>
              <td className="p-4 print:hidden">
                {hasExtraInfo && (
                  <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                )}
              </td>
              <>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {(t.transaction_date || '').split('T')[0]}
                      {t.is_reconciled && (
                        <span className="text-green-500 cursor-help" title="Cleared / Reconciled">✓</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">
                    <div className={t.is_reconciled ? 'opacity-60' : ''}>
                      {t.description}
                    </div> 
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {t.type === 'transfer' ? (
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[50px]">{accounts.find(a => a.id === t.account_id)?.name || '?'}</span>
                        <span className="text-blue-500">→</span>
                        <span className="truncate max-w-[50px] font-bold text-blue-600">{accounts.find(a => a.id === t.to_account_id)?.name || '?'}</span>
                      </div>
                    ) : (
                      accounts.find(a => a.id === t.account_id)?.name || '—'
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                        {t.splits && Array.isArray(t.splits) && t.splits.length > 0 ? 'Mixed Categories' : t.category}
                      </span>
                      {t.splits && Array.isArray(t.splits) && t.splits.length > 0 && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Split Transaction</span>
                      )}
                    </div>
                  </td>
                  <td className={`p-4 text-sm font-bold ${t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}${Number(t.amount).toFixed(2)}
                  </td>
                  <td className="p-4 text-right print:hidden">
                    <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onUpdateStatus(t.id, !t.is_reconciled)}
                        className={`font-bold text-xs uppercase ${t.is_reconciled ? 'text-gray-400' : 'text-green-600'}`}
                      >
                        {t.is_reconciled ? 'Unclear' : 'Clear'}
                      </button>
                      {t.receipt_url && (
                        <button onClick={() => onViewReceipt(t.receipt_url!)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase">Receipt</button>
                      )}
                      <button 
                        onClick={() => onDuplicate(t)} 
                        className="text-gray-400 hover:text-blue-600 font-bold text-xs uppercase transition-colors"
                        title="Duplicate Transaction"
                      >
                        Clone
                      </button>
                      <button onClick={() => onEdit(t)} className="text-gray-400 hover:text-indigo-600 font-bold text-xs uppercase transition-colors">Edit</button>
                      <button onClick={() => onDelete(t)} className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase transition-colors">Delete</button>
                    </div>
                  </td>
              </>
            </tr>
            {isExpanded && (
              <tr className="bg-indigo-50/10 dark:bg-indigo-900/5 transition-colors">
                <td colSpan={7} className="p-4 pl-20">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      {t.notes && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Notes</span>
                          <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{t.notes}"</p>
                        </div>
                      )}
                      {t.tags && t.tags.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tags</span>
                          <div className="flex flex-wrap gap-2">
                            {t.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {t.splits && Array.isArray(t.splits) && t.splits.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Split Breakdown</span>
                        <div className="space-y-2">
                          {(t.splits as any[]).map((s: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                              <span className="font-bold text-gray-600 dark:text-gray-400">{s.category}</span>
                              <span className="font-mono">${s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          )})}
        </tbody>
      </table>
    </div>
    </div>
  );
};