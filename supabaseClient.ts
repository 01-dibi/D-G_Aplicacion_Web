import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  // @ts-ignore
  const env = typeof process !== 'undefined' ? process.env : {};
  // @ts-ignore
  const metaEnv = import.meta.env || {};
  return env[name] || metaEnv[name] || '';
};

const PROJECT_ID = 'optyltslotiphigvceep';
const DEFAULT_URL = `https://${PROJECT_ID}.supabase.co`;

// CLAVE CORRECTA PROPORCIONADA POR EL USUARIO
const CORRECT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdHlsdHNsb3RpcGhpZ3ZjZWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzQwODMsImV4cCI6MjA4NDQxMDA4M30.hyIqx-rpeOlis8ODY8Qp08vezIGN7L0EX5e7idlb_8k';

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || CORRECT_ANON_KEY;

export const connectionStatus = {
  isConfigured: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'),
  url: supabaseUrl,
  projectId: PROJECT_ID,
  status: (!!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ')) ? 'CONECTADO' : 'ERROR_CLAVE'
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);