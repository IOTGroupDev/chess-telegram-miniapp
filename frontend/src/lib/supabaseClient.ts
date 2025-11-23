/**
 * Supabase Client Configuration
 * Chess Telegram Mini App
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit для clock ticks
    },
  },
  global: {
    headers: {
      'x-client-info': 'chess-telegram-miniapp@1.0.0',
    },
  },
});

// Helper для логирования (только в dev)
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, session?.user?.id);
  });
}

export default supabase;
