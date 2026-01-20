import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  // Intentar desde process.env (inyectado por vite.config.ts)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  
  // @ts-ignore
  if (import.meta.env && import.meta.env[name]) return import.meta.env[name];
  
  return '';
};

const PROJECT_ID = 'optyltslotiphigvceep';
const DEFAULT_URL = `https://${PROJECT_ID}.supabase.co`;

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Diagnóstico detallado
export const connectionStatus = {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 20,
  projectId: PROJECT_ID,
  isPlaceholder: !supabaseAnonKey || supabaseAnonKey.includes('placeholder')
};

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);