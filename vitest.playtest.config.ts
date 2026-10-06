import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['playtest/**/*.playtest.ts'],
    environment: 'node',
    // The report is the point of this run: keep printing it even where Vitest
    // would pick a terse reporter, as it does when it detects an AI agent.
    reporters: ['default'],
  },
});
