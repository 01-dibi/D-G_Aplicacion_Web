import { createClient } from '@supabase/supabase-js';

// Fix: Use type assertion for import.meta to avoid "Property 'env' does not exist on type 'ImportMeta'" TypeScript errors
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Prevenir error si las variables no existen aún
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);