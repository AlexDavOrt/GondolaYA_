import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo: Vite sirve el front en :5173 y reenvía /api al servidor Express (:3001).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
