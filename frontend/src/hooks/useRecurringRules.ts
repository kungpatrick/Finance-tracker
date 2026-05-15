import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface RecurringRule {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  day_of_month: number;
  last_processed_month: string | null;
  account_id: string | null;
}

export const useRecurringRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id);

    // Explicitly cast the returned data to match your interface
    if (!error && data) setRules(data as unknown as RecurringRule[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (rule: Omit<RecurringRule, 'id' | 'last_processed_month'>) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    const { data, error } = await supabase
      .from('recurring_rules')
      .insert([{ ...rule, user_id: user.id } as any])
      .select();
    if (!error) fetchRules();
    return { success: !error, error };
  };

  const markAsProcessed = async (ruleId: string, monthDate: string) => {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ last_processed_month: monthDate })
      .eq('id', ruleId);
    if (!error) fetchRules();
    return { success: !error };
  };

  const unmarkAsProcessed = async (ruleId: string) => {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ last_processed_month: null })
      .eq('id', ruleId);
    if (!error) fetchRules();
    return { success: !error };
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('recurring_rules')
      .delete()
      .eq('id', id);
    if (!error) fetchRules();
    return { success: !error };
  };

  return { rules, loading, addRule, markAsProcessed, unmarkAsProcessed, deleteRule, refreshRules: fetchRules };
};