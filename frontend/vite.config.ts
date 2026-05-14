import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Explicitly split heavy libraries into their own chunks
          'vendor-charts': ['recharts'],
          'vendor-utils': ['papaparse', '@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Use IP to avoid DNS resolution issues (ECONNREFUSED)
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
