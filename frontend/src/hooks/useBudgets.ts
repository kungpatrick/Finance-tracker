import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

export type Budget = Database['public']['Tables']['budgets']['Row'];

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('budgets')
      .select('*');

    if (error) console.error('Error fetching budgets:', error);
    else setBudgets(data || []);
    setLoading(false);
  };

  const upsertBudget = async (category: string, limit_amount: number, userId: string) => {
    const { error } = await supabase
      .from('budgets')
      .upsert({ user_id: userId, category, limit_amount }, { onConflict: 'user_id,category' });

    if (error) {
      console.error('Error upserting budget:', error);
      return { success: false, error };
    }

    await fetchBudgets();
    return { success: true };
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return { budgets, loading, upsertBudget, refresh: fetchBudgets };
};