import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@jsx-i18n' })],
  resolve: { alias: { '@jsx-i18n': fileURLToPath(new URL('./src/jsx-i18n', import.meta.url)) } },
  // ชื่อขึ้นต้นด้วย @ ทำให้ dev server เข้าใจผิดว่าเป็นแพ็กเกจ แล้วพรีบันเดิลเป็นสำเนาแยก
  // ผลคือ jsx runtime ไปใช้ตัวแปลคนละตัวกับแอป ภาษาที่ผู้ใช้เลือกจึงไม่ถึง ต้องกันไว้ไม่ให้ถูกพรีบันเดิล
  optimizeDeps: { exclude: ['@jsx-i18n/jsx-runtime', '@jsx-i18n/jsx-dev-runtime'] },
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
