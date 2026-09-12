import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@jsx-i18n' })],
  resolve: { alias: { '@jsx-i18n': fileURLToPath(new URL('./src/jsx-i18n', import.meta.url)) } },
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
