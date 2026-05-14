import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Import the generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure these environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Pass the Database type to createClient to enable full type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);