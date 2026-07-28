import { defineConfig } from 'vitest/config';
import * as tomlPlugin from 'rollup-plugin-toml';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
  plugins: [
    tomlPlugin.default || tomlPlugin
  ]
});
