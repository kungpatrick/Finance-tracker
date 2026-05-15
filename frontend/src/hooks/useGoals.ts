import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth'; // Assuming useAuth provides the current user
import { Goal } from '../components/SavingsGoals'; // Import the Goal interface

interface UseGoalsResult {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<{ success: boolean; error?: string }>;
  fundGoal: (id: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<{ success: boolean; error?: string }>;
  deleteGoal: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshGoals: () => void;
}

export const useGoals = (): UseGoalsResult => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id);

    if (dbError) {
      setError(dbError.message);
      setGoals([]);
    } else {
      setGoals(data || []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals, refreshTrigger]);

  const refreshGoals = () => setRefreshTrigger(prev => prev + 1);

  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user?.id) return { success: false, error: 'User not authenticated.' };
    // Strip UI-only properties that don't exist in the DB schema
    const { has_transactions, ...dbGoal } = goal as any;
    const { data, error: dbError } = await supabase
      .from('savings_goals')
      .insert({ ...dbGoal, user_id: user.id })
      .select();
    if (dbError) {
      setError(dbError.message);
      return { success: false, error: dbError.message };
    }
    refreshGoals();
    return { success: true };
  };

  const fundGoal = async (id: string, amount: number) => {
    const currentGoal = goals.find(g => g.id === id);
    if (!currentGoal) return { success: false, error: 'Goal not found.' };
    const newAmount = (currentGoal.current_amount || 0) + amount;
    const { error: dbError } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', id);
    if (dbError) {
      setError(dbError.message);
      return { success: false, error: dbError.message };
    }
    refreshGoals();
    return { success: true };
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    // Strip UI-only properties that don't exist in the DB schema
    const { has_transactions, ...dbUpdates } = updates as any;
    const { error: dbError } = await supabase.from('savings_goals').update(dbUpdates).eq('id', id);
    if (dbError) return { success: false, error: dbError.message };
    refreshGoals();
    return { success: true };
  };

  const deleteGoal = async (id: string) => {
    const { error: dbError } = await supabase.from('savings_goals').delete().eq('id', id);
    if (dbError) return { success: false, error: dbError.message };
    refreshGoals();
    return { success: true };
  };

  return { goals, loading, error, addGoal, fundGoal, updateGoal, deleteGoal, refreshGoals };
};