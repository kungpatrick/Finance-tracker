import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Explicitly split heavy libraries into their own chunks
          'vendor-charts': ['recharts'],
          'vendor-utils': ['papaparse', '@supabase/supabase-js'],
          // You might add more manual chunks here for other large libraries if needed
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
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
