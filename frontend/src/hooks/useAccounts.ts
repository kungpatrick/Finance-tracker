import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
  institution?: string;
  balance: number;
  cleared_balance: number;
  currency: string;
}

export const useAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    
    if (!error) setAccounts(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, user_id: user?.id }])
      .select();
    if (!error) fetchAccounts();
    return { success: !error, error };
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id);
    if (!error) fetchAccounts();
    return { success: !error, error };
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    if (!error) fetchAccounts();
    return { success: !error };
  };

  return { accounts, loading, addAccount, updateAccount, deleteAccount, refreshAccounts: fetchAccounts };
};