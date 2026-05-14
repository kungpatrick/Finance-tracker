import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Import the generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure these environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Declare a global variable to store the Supabase client instance
// This helps prevent multiple instances during Hot Module Replacement (HMR) in development
declare global {
  var supabaseInstance: ReturnType<typeof createClient<Database>> | undefined;
}

let client: ReturnType<typeof createClient<Database>>;

if (import.meta.env.MODE === 'development') {
  // In development, use a global variable to ensure only one instance is created across HMR updates
  if (!globalThis.supabaseInstance) {
    globalThis.supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  client = globalThis.supabaseInstance;
} else {
  // In production, simply create the client once per module evaluation
  client = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
