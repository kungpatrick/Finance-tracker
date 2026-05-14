import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export const useCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    
    if (!error) setCategories(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...category, user_id: user?.id }])
      .select();
    if (!error) fetchCategories();
    return { success: !error, error };
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (!error) fetchCategories();
    return { success: !error };
  };

  return { categories, loading, addCategory, deleteCategory, refreshCategories: fetchCategories };
};