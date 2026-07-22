import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * ensureSignedIn memoises its promise at module scope, so each test loads a
 * fresh module instance with its own mocked Firebase dependencies.
 */
async function loadAuthService(mocks: {
  getFirebase: () => Promise<unknown>;
  signInAnonymously?: (...args: unknown[]) => Promise<unknown>;
}) {
  vi.resetModules();
  vi.doMock('@/services/firebase', () => ({ getFirebase: vi.fn(mocks.getFirebase) }));
  vi.doMock('firebase/auth', () => ({
    signInAnonymously: vi.fn(
      mocks.signInAnonymously ?? (() => Promise.resolve({ user: { uid: 'u' } })),
    ),
  }));
  const firebase = await import('@/services/firebase');
  const auth = await import('firebase/auth');
  const mod = await import('@/services/authService');
  return { ...mod, getFirebaseMock: firebase.getFirebase, signInMock: auth.signInAnonymously };
}

describe('ensureSignedIn', () => {
  afterEach(() => {
    vi.doUnmock('@/services/firebase');
    vi.doUnmock('firebase/auth');
  });

  it('returns null when Firebase is not configured', async () => {
    const { ensureSignedIn } = await loadAuthService({ getFirebase: () => Promise.resolve(null) });
    await expect(ensureSignedIn()).resolves.toBeNull();
  });

  it('returns the anonymous user id on a successful sign-in', async () => {
    const { ensureSignedIn } = await loadAuthService({
      getFirebase: () => Promise.resolve({ auth: {} }),
      signInAnonymously: () => Promise.resolve({ user: { uid: 'anon-42' } }),
    });
    await expect(ensureSignedIn()).resolves.toBe('anon-42');
  });

  it('returns null on failure and retries on the next call', async () => {
    const signIn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ user: { uid: 'anon-7' } });
    const { ensureSignedIn } = await loadAuthService({
      getFirebase: () => Promise.resolve({ auth: {} }),
      signInAnonymously: signIn,
    });

    await expect(ensureSignedIn()).resolves.toBeNull();
    await expect(ensureSignedIn()).resolves.toBe('anon-7');
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('memoises a single sign-in across concurrent callers', async () => {
    const { ensureSignedIn, getFirebaseMock } = await loadAuthService({
      getFirebase: () => Promise.resolve({ auth: {} }),
      signInAnonymously: () => Promise.resolve({ user: { uid: 'once' } }),
    });

    const [a, b] = await Promise.all([ensureSignedIn(), ensureSignedIn()]);

    expect(a).toBe('once');
    expect(b).toBe('once');
    expect(getFirebaseMock).toHaveBeenCalledTimes(1);
  });
});
