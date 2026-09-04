import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureSignedIn = vi.fn();
vi.mock('@/services/authService', () => ({ ensureSignedIn }));

/** Re-import so the sign-in the store fires at module load runs again. */
async function loadStore() {
  vi.resetModules();
  const module = await import('@/store/useAuthStore');
  return module.useAuthStore;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts without a user and not ready, so nothing waits on the network', async () => {
    ensureSignedIn.mockReturnValue(new Promise(() => {}));

    const store = await loadStore();

    expect(store.getState().uid).toBeNull();
    expect(store.getState().ready).toBe(false);
  });

  it('publishes the user id once the anonymous sign-in resolves', async () => {
    ensureSignedIn.mockResolvedValue('uid123');

    const store = await loadStore();
    await vi.waitFor(() => expect(store.getState().ready).toBe(true));

    expect(store.getState().uid).toBe('uid123');
  });

  it('becomes ready with no user when sign-in is unavailable, instead of hanging', async () => {
    ensureSignedIn.mockResolvedValue(null);

    const store = await loadStore();
    await vi.waitFor(() => expect(store.getState().ready).toBe(true));

    expect(store.getState().uid).toBeNull();
  });
});
