import { createClient } from '@supabase/supabase-js';

// Intentar obtener de import.meta.env (Vite) o de process.env (Inyectado por vite.config.ts)
const getEnv = (name: string) => {
  return (import.meta as any).env?.[name] || (process.env as any)?.[name] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error("CRÍTICO: Supabase URL no detectada. Verifique las Environment Variables en Vercel.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);