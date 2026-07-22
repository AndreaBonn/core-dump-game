import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/** Import a fresh module instance so it re-reads the (stubbed) env at load. */
async function loadModule() {
  vi.resetModules();
  return import('@/services/firebaseConfig');
}

describe('isFirebaseConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true only when every Firebase env variable is a non-empty string', async () => {
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, 'value');
    }
    const { isFirebaseConfigured } = await loadModule();
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('is false when any env variable is missing', async () => {
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, 'value');
    }
    vi.stubEnv('VITE_FIREBASE_APP_ID', '');
    const { isFirebaseConfigured } = await loadModule();
    expect(isFirebaseConfigured()).toBe(false);
  });
});
