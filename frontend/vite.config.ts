import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // ── Vitest ────────────────────────────────────────────────────────────────
  test: {
    // Use jsdom so React components can render in Node
    environment: 'jsdom',
    // Run setup file before each test suite (extends expect with jest-dom)
    setupFiles: ['./src/test/setup.ts'],
    // Only pick up *.test.ts(x) files inside src/
    include: ['src/**/*.test.{ts,tsx}'],
    // Explicit imports only (no implicit describe/it/expect globals)
    globals: false,
  },
});
