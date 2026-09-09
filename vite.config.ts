import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          katex: ['katex'],
        },
      },
    },
  },
  // host: true -> listen on all interfaces (IPv4 + IPv6) so both
  // http://localhost:5173 and http://127.0.0.1:5173 work
  server: { host: true, port: 5173, open: false },
  preview: { host: true, port: 4173 },
});
