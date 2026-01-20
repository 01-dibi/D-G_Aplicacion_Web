import { createClient } from '@supabase/supabase-js';

// Intentamos obtener las variables de múltiples fuentes para máxima compatibilidad
const getEnv = (name: string) => {
  if (typeof window !== 'undefined' && (window as any).process?.env?.[name]) return (window as any).process.env[name];
  // @ts-ignore
  return import.meta.env?.[name] || '';
};

// URL detectada por el string de conexión del usuario
const PROJECT_ID = 'optyltslotiphigvceep';
const FALLBACK_URL = `https://${PROJECT_ID}.supabase.co`;

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseAnonKey) {
  console.warn("⚠️ FALTA VITE_SUPABASE_ANON_KEY: La persistencia no funcionará hasta que configures la clave ANON en las variables de entorno.");
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);