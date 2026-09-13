import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tomlPlugin from 'rollup-plugin-toml';

export default defineConfig({
  base: './',
  plugins: [react(), tomlPlugin],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});