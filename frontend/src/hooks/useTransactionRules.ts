import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface TransactionRule {
  id: string;
  description_pattern: string;
  auto_category: string | null;
  alias_name: string | null;
  auto_tags: string[];
  is_active: boolean;
}

export interface TransactionRuleInsert {
  user_id?: string;
  description_pattern: string;
  auto_category: string | null;
  alias_name: string | null;
  auto_tags: string[];
  is_active: boolean;
}

export const useTransactionRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('transaction_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (!error) setRules(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const applyRules = (description: string) => {
    const match = rules.find(rule => 
      description.toLowerCase().includes(rule.description_pattern.toLowerCase())
    );
    return match ? { category: match.auto_category, tags: match.auto_tags, alias: match.alias_name } : null;
  };

  const updateRule = async (id: string, updates: Partial<Omit<TransactionRule, 'id'>>) => {
    const { error } = await supabase
      .from('transaction_rules')
      .update(updates)
      .eq('id', id);
    if (!error) fetchRules();
    return { success: !error, error };
  };

  const addRule = async (rule: Omit<TransactionRule, 'id'>) => {
    const { error } = await supabase
      .from('transaction_rules')
      .insert([{ ...rule, user_id: user?.id }]);
    if (!error) fetchRules();
    return { success: !error, error };
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('transaction_rules')
      .delete()
      .eq('id', id);
    if (!error) fetchRules();
    return { success: !error };
  };

  return { rules, loading, addRule, updateRule, deleteRule, applyRules, refreshRules: fetchRules };
};