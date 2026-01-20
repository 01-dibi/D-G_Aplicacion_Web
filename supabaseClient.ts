import { createClient } from '@supabase/supabase-js';

// En Vite, las variables deben empezar con VITE_ para ser públicas
// Pero en el define de vite.config.ts las estamos inyectando en process.env
const getEnv = (name: string) => {
  // @ts-ignore
  return import.meta.env?.[name] || (typeof process !== 'undefined' ? process.env?.[name] : '') || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Si no hay variables, mostramos un error claro en consola para depuración
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error("⚠️ CONFIGURACIÓN FALTANTE: No se detectaron las variables de Supabase.");
  console.log("Asegúrese de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);