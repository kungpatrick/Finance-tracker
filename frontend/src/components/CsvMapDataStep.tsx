import React, { useState } from 'react';
import { Transaction } from '../hooks/useTransactions';
import { CATEGORIES } from './transaction.schema';
import { Account } from '../hooks/useAccounts';

type MappableTransaction = Omit<Transaction, 'id' | 'receipt_url' | 'user_id'>;

interface AppField {
  key: keyof MappableTransaction;
  label: string;
  required: boolean;
}

interface CsvMapDataStepProps {
  csvHeaders: string[];
  csvPreviewData: any[];
  fullCsvData: any[];
  accounts: Account[];
  onBack: () => void;
  onMapComplete: (data: MappableTransaction[]) => void;
}

export const CsvMapDataStep: React.FC<CsvMapDataStepProps> = ({ 
  csvHeaders, 
  csvPreviewData, 
  fullCsvData, 
  accounts,
  onBack, 
  onMapComplete 
}) => {
  const appFields: AppField[] = [
    { key: 'transaction_date', label: 'Transaction Date', required: true },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category', required: true },
    { key: 'type', label: 'Type', required: true },
    { key: 'account_id', label: 'Linked Account', required: false },
  ];

  const initialMapping: Record<string, string> = (() => {
    const result: Record<string, string> = {};
    const used = new Set<string>();
    
    appFields.forEach(field => {
      const foundHeader = csvHeaders.find(header => {
        if (used.has(header)) return false;
        const h = header.toLowerCase();
        const k = String(field.key).toLowerCase();
        return h === k || 
          (field.key === 'amount' && (h.includes('amount') || h.includes('value') || h.includes('price') || h.includes('cost') || h.includes('total') || h.includes('amt'))) ||
          (field.key === 'transaction_date' && (h.includes('date') || h.includes('time') || h.includes('day'))) ||
          (field.key === 'description' && (h.includes('description') || h.includes('desc') || h.includes('memo') || h.includes('note') || h.includes('payee') || h.includes('merchant'))) ||
          (field.key === 'category' && (h.includes('category') || h.includes('class') || h.includes('cat'))) ||
          (field.key === 'type' && (h === 'type' || (h.includes('type') && !h.includes('account')) || h.includes('kind') || h.includes('mode') || h.includes('credit') || h.includes('debit'))) ||
          (field.key === 'account_id' && (h.includes('account') || h.includes('src') || h.includes('bank')))
      });
      result[String(field.key)] = foundHeader || '';
      if (foundHeader) used.add(foundHeader);
    });
    return result;
  })();

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [error, setError] = useState<string>('');

  const handleMappingChange = (appFieldKey: string, csvHeader: string) => {
    setMapping(prev => ({ ...prev, [appFieldKey]: csvHeader }));
  };

  const transformValue = (key: keyof MappableTransaction, rawValue: any) => {
    if (key === 'amount') {
      const strValue = rawValue !== null && rawValue !== undefined ? String(rawValue) : "0";
      const isNegativeNotation = /^\(.*\)$/.test(strValue.trim());
      let cleanedValue = strValue.replace(/[^0-9.-]+/g, "");
      
      let parsedValue = parseFloat(cleanedValue);
      if (isNegativeNotation && parsedValue > 0) parsedValue *= -1;
      
      // Triggers expect a positive magnitude; the 'type' handles the math direction.
      // We take the absolute value to ensure consistent balance calculations.
      return isNaN(parsedValue) ? 0 : Math.abs(parsedValue);
    }

    if (key === 'description') {
      // Aggressively normalize description:
      // 1. Convert all types of whitespace/non-printable chars to standard spaces
      // 2. Remove non-ASCII characters that often hide in bank exports
      const str = (rawValue !== null && rawValue !== undefined) ? String(rawValue) : '';
      return str
        .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable ASCII and hidden Unicode chars
        .trim()
        .replace(/\s+/g, ' ');
    }
    
    if (key === 'category') {
      const val = (rawValue !== null && rawValue !== undefined) ? String(rawValue).trim() : '';
      if (!val) return 'General';

      const normalized = CATEGORIES.find(
        c => c.toLowerCase() === val.toLowerCase()
      );
      
      // Return the normalized value from our list if found (to maintain casing),
      // otherwise use the value found in the CSV instead of forcing 'General'.
      return normalized || val;
    }

    if (key === 'type') {
      const val = String(rawValue || '').toLowerCase().trim();
      // Common banking terms for income
      if (val.includes('income') || val.includes('credit') || val.includes('deposit') || val === 'in' || val === 'cr') {
        return 'income';
      }
      return 'expense';
    }

    if (key === 'account_id') {
      const val = String(rawValue || '').toLowerCase().trim();
      if (!val) return null;
      // Try to find an account ID by matching the name in the CSV
      const match = accounts.find(a => 
        a.name.toLowerCase() === val || 
        a.institution?.toLowerCase() === val ||
        a.type.toLowerCase() === val
      );
      return match ? match.id : null;
    }

    if (key === 'transaction_date') {
      if (!rawValue) return new Date().toISOString().split('T')[0];
      const dateObj = new Date(rawValue);
      // Check if Date object is valid
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
      // Fallback: If it's a string that looks like a date but Date() failed, 
      // return raw or a default to prevent crash, though Zod will catch this later.
      return String(rawValue).split(' ')[0]; 
    }

    return rawValue;
  };

  const validateMapping = (): boolean => {
    for (const field of appFields) {
      if (field.required && !mapping[String(field.key)]) {
        setError(`Please map a column for the required field: ${field.label}`);
        return false;
      }
    }
    const mappedCsvColumns = Object.values(mapping).filter(val => val !== '');
    const uniqueMappedCsvColumns = new Set(mappedCsvColumns);
    if (mappedCsvColumns.length !== uniqueMappedCsvColumns.size) {
      const duplicates = mappedCsvColumns.filter((item, index) => mappedCsvColumns.indexOf(item) !== index);
      setError(`Cannot map multiple application fields to the same CSV column: "${duplicates[0]}".`);
      return false;
    }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (!validateMapping()) return;

    const transformedData: MappableTransaction[] = fullCsvData.map(row => {
      const newRow: any = {};
      for (const appField of appFields) {
        const csvColumn = mapping[String(appField.key)];
        const rawValue = csvColumn ? row[csvColumn] : null;
        newRow[appField.key] = transformValue(appField.key, rawValue);
      }
      return newRow as MappableTransaction;
    });

    onMapComplete(transformedData);
  };

  return (
    <div className="transition-colors">
      <h3 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-6">Import Transactions (Step 2: Map Data)</h3>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 text-red-700 text-sm flex items-center gap-2">
           <span className="dark:text-red-400">⚠️</span> {error}
        </div>
      )}

      <div className="mb-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Match your CSV columns to the required transaction fields:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appFields.map(field => (
            <div key={String(field.key)} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <select
                id={`map-${String(field.key)}`} // Added unique ID
                value={mapping[String(field.key)]}
                onChange={(e) => handleMappingChange(String(field.key), e.target.value)}
                aria-label={`Map to ${field.label}`} // Added aria-label for accessibility
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors text-sm"
              >
                <option value="">-- Select CSV Column --</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 transition-colors">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Preview (First 5 Rows)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-colors">
              <tr>
                {appFields.map(field => (
                  <th key={String(field.key)} className="p-3 font-semibold text-gray-600 dark:text-gray-300 transition-colors">
                    {field.label}
                    {mapping[String(field.key)] && <span className="ml-1 text-[10px] text-indigo-400 font-normal">({mapping[String(field.key)]})</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {csvPreviewData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  {appFields.map(field => {
                    const rawValue = row[mapping[String(field.key)]];
                    const transformed = mapping[String(field.key)] ? transformValue(field.key, rawValue) : null;
                    return (
                      <td key={String(field.key)} className={`p-3 ${field.key === 'amount' ? 'font-mono' : ''} text-gray-600 dark:text-gray-300 transition-colors`}>
                        {transformed !== null ? (
                          field.key === 'account_id' ? (accounts.find(a => a.id === transformed)?.name || 'Default') : String(transformed)
                        ) : (
                          <span className="text-gray-300 dark:text-gray-500 italic transition-colors">unmapped</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button" 
          onClick={onBack} 
          className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
        >
          Back
        </button>
        <button 
          type="button" 
          onClick={handleConfirm} 
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-bold shadow-md"
        >
          Review Transactions
        </button>
      </div>
    </div>
  );
};