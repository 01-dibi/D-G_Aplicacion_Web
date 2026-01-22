import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    // Incrementamos el límite para evitar la advertencia de Vercel
    chunkSizeWarningLimit: 1600,
    // Optimizamos la salida para separar librerías pesadas
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@google/genai')) return 'vendor-gemini';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000
  }
});