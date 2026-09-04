import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Re-import the store so its module-level read of localStorage runs again. */
async function loadStore() {
  vi.resetModules();
  const module = await import('@/store/useSettingsStore');
  return module.useSettingsStore;
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts unmuted with an empty nickname on a fresh browser', async () => {
    const store = await loadStore();

    expect(store.getState().muted).toBe(false);
    expect(store.getState().nickname).toBe('');
  });

  it('persists the mute state and reads it back on the next visit', async () => {
    const store = await loadStore();

    store.getState().toggleMuted();

    expect(store.getState().muted).toBe(true);
    expect(localStorage.getItem('coredump.muted')).toBe('true');

    const reopened = await loadStore();
    expect(reopened.getState().muted).toBe(true);
  });

  it('trims the nickname and caps it at the length the leaderboard accepts', async () => {
    const store = await loadStore();

    store.getState().setNickname(`  ${'x'.repeat(40)}  `);

    expect(store.getState().nickname).toHaveLength(24);
    expect(localStorage.getItem('coredump.nickname')).toHaveLength(24);
  });

  it('keeps the mute state and the audio manager in step', async () => {
    const store = await loadStore();
    const { audioManager } = await import('@/engine/audio/AudioManager');

    store.getState().toggleMuted();
    expect(audioManager.isMuted()).toBe(true);

    store.getState().toggleMuted();
    expect(audioManager.isMuted()).toBe(false);
  });

  it('still starts when localStorage is unavailable, as in private mode', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.');
    });

    const store = await loadStore();

    expect(store.getState().muted).toBe(false);
    expect(store.getState().nickname).toBe('');
  });

  it('does not break when a write to localStorage is refused', async () => {
    const store = await loadStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => store.getState().toggleMuted()).not.toThrow();
    // The setting still applies to this session even though it was not saved.
    expect(store.getState().muted).toBe(true);
  });
});
