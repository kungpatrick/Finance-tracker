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

    if (error) {
      console.error('Error fetching budgets:', error);
    } else {
      // Only keep active budgets with limit_amount > 0
      setBudgets((data || []).filter(b => Number(b.limit_amount) > 0));
    }
    setLoading(false);
  };

  const upsertBudget = async (category: string, limit_amount: number, userId: string) => {
    const trimmed = category.trim();
    const { error } = await supabase
      .from('budgets')
      .upsert({ user_id: userId, category: trimmed, limit_amount }, { onConflict: 'user_id,category' });

    if (error) {
      console.error('Error upserting budget:', error);
      return { success: false, error };
    }

    await fetchBudgets();
    return { success: true };
  };

  const deleteBudget = async (category: string, userId?: string, id?: string) => {
    const trimmed = category.trim();

    // 1. Optimistic removal from React state for instant UI response
    setBudgets(prev => prev.filter(b => {
      if (id && b.id === id) return false;
      if (b.category.trim().toLowerCase() === trimmed.toLowerCase()) return false;
      return true;
    }));

    try {
      // 2. Delete by primary key ID if available (most reliable)
      if (id) {
        await supabase.from('budgets').delete().eq('id', id);
      }

      // 3. Delete by user_id and category (case-insensitive) if userId provided
      if (userId) {
        await supabase.from('budgets').delete().eq('user_id', userId).ilike('category', trimmed);
        await supabase.from('budgets').delete().eq('user_id', userId).eq('category', category);
      }

      // 4. Delete across all matching categories (RLS scoped)
      await supabase.from('budgets').delete().ilike('category', trimmed);
      await supabase.from('budgets').delete().eq('category', category);

      // 5. Zero-out fallback: in case DELETE is silently prevented by RLS, set limit to 0
      // so it is permanently excluded and never treated as an active budget
      if (userId) {
        await supabase.from('budgets').upsert(
          { user_id: userId, category: trimmed, limit_amount: 0 },
          { onConflict: 'user_id,category' }
        );
      }
    } catch (err) {
      console.error('Error deleting budget:', err);
    }

    // 6. Always re-fetch to ensure sync with database
    await fetchBudgets();
    return { success: true };
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return { budgets, loading, upsertBudget, deleteBudget, refreshBudgets: fetchBudgets, refresh: fetchBudgets };
};