import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  // Intentar desde import.meta.env (Vite estándar)
  // @ts-ignore
  if (import.meta.env && import.meta.env[name]) return import.meta.env[name];
  
  // Intentar desde process.env (Vercel/Node fallback)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  
  return '';
};

const PROJECT_ID = 'optyltslotiphigvceep';
const FALLBACK_URL = `https://${PROJECT_ID}.supabase.co`;

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Exportamos si la configuración es válida para mostrarlo en la UI
export const isConfigValid = !!supabaseAnonKey && !supabaseAnonKey.includes('placeholder');

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);