import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth'; // Assuming useAuth provides the current user
import { Debt } from '../components/LiabilitiesAndDebts'; // Import the Debt interface

interface UseDebtsResult {
  debts: Debt[];
  loading: boolean;
  error: string | null;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<{ success: boolean; error?: string }>;
  payDebt: (id: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  updateDebt: (id: string, updates: Partial<Debt>) => Promise<{ success: boolean; error?: string }>;
  deleteDebt: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshDebts: () => void;
}

export const useDebts = (): UseDebtsResult => {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDebts = useCallback(async () => {
    if (!user?.id) {
      setDebts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id);

    if (dbError) {
      setError(dbError.message);
      setDebts([]);
    } else {
      setDebts(data || []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts, refreshTrigger]);

  const refreshDebts = () => setRefreshTrigger(prev => prev + 1);

  const addDebt = async (debt: Omit<Debt, 'id'>) => {
    if (!user?.id) return { success: false, error: 'User not authenticated.' };
    const { data, error: dbError } = await supabase
      .from('liabilities')
      .insert({ ...debt, user_id: user.id })
      .select();
    if (dbError) {
      setError(dbError.message);
      return { success: false, error: dbError.message };
    }
    refreshDebts();
    return { success: true };
  };

  const payDebt = async (id: string, amount: number) => {
    const currentDebt = debts.find(d => d.id === id);
    if (!currentDebt) return { success: false, error: 'Debt not found.' };
    const newRemainingAmount = currentDebt.remaining_amount - amount;
    const { error: dbError } = await supabase
      .from('liabilities')
      .update({ remaining_amount: newRemainingAmount })
      .eq('id', id);
    if (dbError) {
      setError(dbError.message);
      return { success: false, error: dbError.message };
    }
    refreshDebts();
    return { success: true };
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    const { error: dbError } = await supabase.from('liabilities').update(updates).eq('id', id);
    if (dbError) return { success: false, error: dbError.message };
    refreshDebts();
    return { success: true };
  };

  const deleteDebt = async (id: string) => {
    const { error: dbError } = await supabase.from('liabilities').delete().eq('id', id);
    if (dbError) return { success: false, error: dbError.message };
    refreshDebts();
    return { success: true };
  };

  return { debts, loading, error, addDebt, payDebt, updateDebt, deleteDebt, refreshDebts };
};