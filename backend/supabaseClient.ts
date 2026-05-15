import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Import the generated types
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Ensure these environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Pass the Database type to createClient to enable full type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);