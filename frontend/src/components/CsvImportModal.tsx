import React, { useState } from 'react';
import { CsvMapDataStep } from './CsvMapDataStep';
import { CsvReviewStep } from './CsvReviewStep';
import Papa from 'papaparse';
import { useTransactions, Transaction } from '../hooks/useTransactions';
import { Account } from '../hooks/useAccounts';

interface CsvImportModalProps {
  onClose: () => void;
  onImportSuccess?: () => void;
  userId?: string;
  accounts: Account[];
  existingTransactions: Transaction[];
  onApplyRules?: (description: string) => { category: string | null, tags: string[], alias?: string | null } | null;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ onClose, onImportSuccess, userId, accounts, existingTransactions, onApplyRules }) => {
  const { bulkAddTransactions } = useTransactions();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fullCsvData, setFullCsvData] = useState<any[]>([]);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [preparedData, setPreparedData] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a CSV file to upload.");
      return;
    }

    setLoading(true);
    setError('');

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.errors.length) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          setLoading(false);
          return;
        }

        // Filter out completely empty rows that skipEmptyLines might miss
        const cleanedData = results.data.filter((row: any) => 
          Object.values(row).some(val => val !== undefined && val !== null && String(val).trim() !== "")
        );

        if (cleanedData.length === 0) {
          setError("The CSV file appears to be empty.");
          setLoading(false);
          return;
        }

        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
        }
        setFullCsvData(cleanedData);
        setCsvPreviewData(cleanedData.slice(0, 5)); 
        setLoading(false);
        setCurrentStep(2); // Move to mapping step
      },
      error: (err: Error) => {
        setLoading(false);
        setError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const handlePrepareReview = (mappedData: any[]) => {
    const enriched = mappedData.map(item => {
      let description = item.description;
      const originalDescription = item.description;
      let category = item.category;
      let tags = item.tags || [];

      if (onApplyRules) {
        const suggestion = onApplyRules(item.description);
        if (suggestion) {
          if (suggestion.alias) description = suggestion.alias;
          if (suggestion.category) category = suggestion.category;
          if (suggestion.tags.length > 0) tags = Array.from(new Set([...tags, ...suggestion.tags]));
        }
      }

      return {
        ...item,
        description,
        originalDescription,
        category,
        tags,
        user_id: userId,
        account_id: item.account_id || selectedAccountId || undefined
      };
    });

    setPreparedData(enriched);
    setCurrentStep(3);
  };

  const handleFinalImport = async (finalData: any[]) => {
    setLoading(true);
    setError('');
    try {
      // Filter out originalDescription and ensure account_id is null if not set
      const dataToImport = finalData.map(({ originalDescription, ...rest }) => ({
        ...rest,
        account_id: rest.account_id || null // Ensure account_id is null if undefined/empty
      }));
      const result = await bulkAddTransactions(dataToImport, userId!);
      if (result.success) {
        onImportSuccess?.();
        onClose();
      } else {
        setError(typeof result.error === 'string' ? result.error : "Failed to import transactions.");
      }
    } catch (err) {
      setError("Error during final import.");
      console.error("Final import error:", err);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[1000] p-4">
      <div className={`bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto relative transition-colors ${
        currentStep === 1 ? 'max-w-lg' : currentStep === 2 ? 'max-w-4xl' : 'max-w-5xl'
      }`}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        {currentStep === 1 && (
          <>
            <h3 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-6 transition-colors">Import CSV (Step 1: Upload)</h3>
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">1. Select Destination Account</label>
                <select 
                  value={selectedAccountId} 
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:text-white transition-colors" // Added aria-label
                >
                  <option value="">-- No Specific Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.institution})</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1 italic">All transactions in this file will be linked to this account.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">2. Choose CSV File</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 transition-colors"
              />
              {error && (
                <div className="text-red-600 text-sm flex items-center gap-2">
                   <span className="dark:text-red-400">⚠️</span> {error}
                </div>
              )}
              </div>
              <p className="text-sm text-gray-500">Upload your CSV file containing transaction data. We'll guide you through mapping the columns in the next step.</p>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
              <button 
                type="button" 
                onClick={handleUpload} 
                disabled={loading || !selectedFile} 
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-bold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Processing...' : 'Upload & Next'}
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <CsvMapDataStep
            csvHeaders={csvHeaders}
            csvPreviewData={csvPreviewData} // Still pass preview data for display
            fullCsvData={fullCsvData} // Pass full data for transformation
            accounts={accounts}
            onBack={() => setCurrentStep(1)}
            onMapComplete={handlePrepareReview}
          />
        )}

        {currentStep === 3 && (
          <CsvReviewStep 
            data={preparedData}
            existingTransactions={existingTransactions}
            accounts={accounts}
            onBack={() => setCurrentStep(2)}
            onConfirm={handleFinalImport}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};