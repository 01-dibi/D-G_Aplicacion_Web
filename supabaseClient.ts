
import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  // @ts-ignore
  const envValue = (import.meta.env?.[name]) || (process.env?.[name]);
  return envValue || '';
};

const PROJECT_ID = 'optyltslotiphigvceep';
const DEFAULT_URL = `https://${PROJECT_ID}.supabase.co`;

// Clave anon fallback proporcionada
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdHlsdHNsb3RpcGhpZ3ZjZWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzQwODMsImV4cCI6MjA4NDQxMDA4M30.hyIqx-rpeOlis8ODY8Qp08vezIGN7L0EX5e7idlb_8k';

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_ANON_KEY;

export const connectionStatus = {
  isConfigured: !!supabaseAnonKey && supabaseAnonKey.length > 50,
  url: supabaseUrl,
  status: (!!supabaseAnonKey && supabaseAnonKey.length > 50) ? 'CONECTADO' : 'ERROR_CONFIG'
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
