import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Honor a PORT assigned by the harness (autoPort) while defaulting to 5173.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Worktrees live under .claude/, and each holds a full checkout with its own
    // tests. Without this, a run from the repo root collects every branch's suite
    // at once and reports failures that belong to code not checked out here.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
