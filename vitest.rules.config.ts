import { defineConfig } from 'vitest/config';

/**
 * Security-rules tests run against the Firestore emulator, not jsdom, and are
 * kept out of the default suite: `npm test` must stay runnable without the
 * emulator. Launched by `npm run test:rules`, which starts the emulator first.
 */
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
