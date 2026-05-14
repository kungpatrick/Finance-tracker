import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase'; // Import the generated types

// Define types based on your Supabase schema
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('transactions' as any)
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
      setTransactions([]);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (
    transaction: any, 
    file?: File
  ): Promise<{ success: boolean; data: any; error?: string }> => {
    setError(null);
    let receipt_url: string | null = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${transaction.user_id}/${fileName}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading receipt:', uploadError);
        setError(uploadError.message);
        return { success: false, error: uploadError.message };
      }
      receipt_url = uploadData?.path || null;
    }

    const { data, error } = await supabase
      .from('transactions' as any)
      .insert([{ ...transaction, receipt_url }])
      .select();

    if (error) {
      console.error('Error adding transaction:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }

    if (data) {
      setTransactions(prev => [data[0], ...prev]);
    }
    return { success: true, data: data ? data[0] : null };
  };

  const bulkAddTransactions = async (transactions: Omit<TransactionInsert, 'id' | 'receipt_url'>[], userId: string) => {
    setError(null);
    const transactionsWithUserId = transactions.map(t => ({ ...t, user_id: userId }));
    const { data, error } = await supabase
      .from('transactions' as any)
      .insert(transactionsWithUserId)
      .select();

    if (error) {
      console.error('Error bulk adding transactions:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
    if (data) {
      setTransactions(prev => [...data, ...prev]);
    }
    return { success: true, data };
  };

  const updateTransaction = async (id: string, updates: TransactionUpdate) => {
    setError(null);
    const { data, error } = await supabase
      .from('transactions' as any)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating transaction:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
    if (data) {
      setTransactions(prev => prev.map(t => (t.id === id ? data[0] : t)));
    }
    return { success: true, data: data ? data[0] : null };
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/transactions/bulk', { 
        method: 'DELETE',
        headers,
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const bulkUpdateTransactionStatus = async (ids: string[], is_reconciled: boolean) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/transactions/bulk-status', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ ids, is_reconciled }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteTransaction = async (id: string, receiptPath?: string | null) => {
    setError(null);
    const { error } = await supabase
      .from('transactions' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }

    if (receiptPath) {
      const { error: deleteFileError } = await supabase.storage
        .from('receipts')
        .remove([receiptPath]);
      if (deleteFileError) {
        console.error('Error deleting receipt file:', deleteFileError);
        // Don't block transaction deletion if file deletion fails
      }
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    return { success: true };
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('receipts').getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
    addTransaction,
    bulkAddTransactions,
    updateTransaction,
    bulkDeleteTransactions,
    bulkUpdateTransactionStatus,
    deleteTransaction,
    getPublicUrl,
  };
};
