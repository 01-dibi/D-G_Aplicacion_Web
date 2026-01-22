import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  let envVal = '';
  try {
    // Intenta acceder a través de import.meta.env (Vite) o process.env (Node/Workarounds)
    // @ts-ignore
    envVal = (import.meta && import.meta.env && import.meta.env[name]) || '';
    if (!envVal) {
      // @ts-ignore
      envVal = (typeof process !== 'undefined' && process.env && process.env[name]) || '';
    }
  } catch (e) {
    console.warn(`Error accediendo a variable ${name}:`, e);
  }
  return envVal;
};

const PROJECT_ID = 'optyltslotiphigvceep';
const DEFAULT_URL = `https://${PROJECT_ID}.supabase.co`;

// Clave anon proporcionada como fallback si las variables de entorno fallan
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdHlsdHNsb3RpcGhpZ3ZjZWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzQwODMsImV4cCI6MjA4NDQxMDA4M30.hyIqx-rpeOlis8ODY8Qp08vezIGN7L0EX5e7idlb_8k';

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_ANON_KEY;

export const connectionStatus = {
  isConfigured: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'),
  url: supabaseUrl,
  projectId: PROJECT_ID,
  status: (!!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ')) ? 'CONECTADO' : 'ERROR_CONFIG'
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);