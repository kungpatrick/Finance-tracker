import React, { useState, useMemo } from 'react';
import { Transaction } from '../hooks/useTransactions';
import { Account } from '../hooks/useAccounts';
import { normalizeDescription } from '../utils/stringUtils';

interface CsvReviewStepProps {
  data: any[];
  existingTransactions: Transaction[];
  accounts: Account[];
  onBack: () => void;
  onConfirm: (finalData: any[]) => void;
  loading: boolean;
}

export const CsvReviewStep: React.FC<CsvReviewStepProps> = ({ data, existingTransactions, accounts, onBack, onConfirm, loading }) => {
  // State to track which items the user wants to import
  const [selectedIndices, setSelectedIds] = useState<Set<number>>(() => {
    // Default to selecting only non-duplicate records to prevent double-counting
    const dbLookup = new Set(existingTransactions.map(ext => 
      `${(ext.transaction_date || '').split('T')[0]}|${Number(ext.amount).toFixed(2)}|${normalizeDescription(ext.description)}|${ext.account_id}`
    ));

    const seenInFile = new Set<string>();
    const initialSelection = new Set<number>();

    data.forEach((item, index) => {
      const itemKey = `${item.transaction_date}|${Number(item.amount).toFixed(2)}|${normalizeDescription(item.description)}|${item.account_id}`;
      
      const isDuplicate = dbLookup.has(itemKey) || seenInFile.has(itemKey);
      seenInFile.add(itemKey);
      
      if (!isDuplicate) {
        initialSelection.add(index);
      }
    });
    return initialSelection;
  });
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);

  const reviewData = useMemo(() => {
    // Create a lookup set for existing database transactions (O(1) performance)
    const dbLookup = new Set(existingTransactions.map(ext => 
      `${(ext.transaction_date || '').split('T')[0]}|${Number(ext.amount).toFixed(2)}|${normalizeDescription(ext.description)}|${ext.account_id}`
    ));

    const seenInFile = new Set<string>();
    return data.map((item, index) => {
      // Use the processed description for comparison, as it's what's stored in the DB after rules.
      const descToMatch = normalizeDescription(item.description);
      const itemKey = `${item.transaction_date}|${Number(item.amount).toFixed(2)}|${descToMatch}|${item.account_id}`;
      
      const isDuplicateInDb = dbLookup.has(itemKey);
      const isDuplicateInFile = seenInFile.has(itemKey);
      seenInFile.add(itemKey);

      return { 
        ...item, 
        isDuplicate: isDuplicateInDb || isDuplicateInFile, 
        duplicateType: isDuplicateInDb ? 'database' : (isDuplicateInFile ? 'file' : null),
        index 
      };
    });
  }, [data, existingTransactions]);

  const duplicateCount = useMemo(() => reviewData.filter(d => d.isDuplicate).length, [reviewData]);

  const hasSelectedDuplicates = useMemo(() => {
    return Array.from(selectedIndices).some(idx => reviewData.find(d => d.index === idx)?.isDuplicate);
  }, [selectedIndices, reviewData]);

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIds(next);
  };

  const handleSkipDuplicates = () => {
    const next = new Set<number>();
    reviewData.forEach(d => { if (!d.isDuplicate) next.add(d.index); });
    setSelectedIds(next);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Step 3: Review & De-duplicate</h3>
          {duplicateCount > 0 && (
            <button 
              onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${showOnlyDuplicates ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800 hover:bg-orange-100'}`}
            >
              {showOnlyDuplicates ? 'Show All Records' : `View ${duplicateCount} Duplicates`}
            </button>
          )}
        </div>
        {duplicateCount > 0 && !showOnlyDuplicates && hasSelectedDuplicates && (
          <button 
            onClick={handleSkipDuplicates}
            className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-800 hover:bg-orange-100 transition-all"
          >
            ⚠️ Skip {duplicateCount} Potential Duplicates
          </button>
        )}
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" checked={selectedIndices.size === data.length} onChange={() => setSelectedIds(selectedIndices.size === data.length ? new Set() : new Set(data.map((_, i) => i)))} className="rounded" /></th>
                <th className="p-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                <th className="p-3 text-xs font-bold text-gray-400 uppercase">Description</th>
                <th className="p-3 text-xs font-bold text-gray-400 uppercase">Linked Account</th>
                <th className="p-3 text-xs font-bold text-gray-400 uppercase">Category</th>
                <th className="p-3 text-xs font-bold text-gray-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reviewData.filter(d => !showOnlyDuplicates || d.isDuplicate).map((row) => (
                <tr key={row.index} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${row.isDuplicate ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}`}>
                  <td className="p-3">
                    <input type="checkbox" checked={selectedIndices.has(row.index)} onChange={() => toggleSelect(row.index)} className="rounded text-indigo-600" />
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.transaction_date}</td>
                  <td className="p-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {row.description}
                        {row.originalDescription && row.originalDescription !== row.description && (
                          <span className="text-[10px] text-indigo-500" title={`Rule applied to: ${row.originalDescription}`}>✨</span>
                        )}
                      </div>
                      {row.isDuplicate && (
                        <span className={`w-fit mt-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm border ${
                          row.duplicateType === 'database' 
                            ? 'bg-orange-100 text-orange-700 border-orange-200' 
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {row.duplicateType === 'database' ? 'Already in DB' : 'Duplicate in File'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {accounts.find(a => a.id === row.account_id)?.name || 'Default'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {row.category}
                    </span>
                  </td>
                  <td className={`p-3 font-mono font-bold ${row.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {row.type === 'income' ? '+' : '-'}${row.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500">
          Preparing to import <span className="font-bold text-indigo-600">{selectedIndices.size}</span> transactions.
        </p>
        <div className="flex gap-3">
          <button
            type="button" 
            onClick={onBack} 
            className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            Back
          </button>
          <button 
            disabled={loading || selectedIndices.size === 0}
            onClick={() => onConfirm(data.filter((_, i) => selectedIndices.has(i)))} 
            className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-bold shadow-lg disabled:opacity-50"
          >
            {loading ? 'Importing...' : `Import ${selectedIndices.size} Transactions`}
          </button>
        </div>
      </div>
    </div>
  );
};