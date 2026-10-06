import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COSMETICS, DEFAULT_COSMETICS } from '@/config/cosmetics';

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

  it('starts every cosmetic slot at the first catalog entry', async () => {
    const store = await loadStore();
    for (const slot of ['cursor', 'chain', 'palette'] as const) {
      expect(store.getState().cosmetics[slot]).toBe(
        COSMETICS.find((item) => item.slot === slot)!.id,
      );
    }
  });

  it('persists each cosmetic slot without replacing the other selections and survives reload', async () => {
    const store = await loadStore();
    store.getState().selectCosmetic('cursor', 'ring');
    store.getState().selectCosmetic('chain', 'hex');
    store.getState().selectCosmetic('palette', 'okabe-ito');
    const expected = { cursor: 'ring', chain: 'hex', palette: 'okabe-ito' };
    expect(store.getState().cosmetics).toEqual(expected);
    expect(JSON.parse(localStorage.getItem('coredump.cosmetics')!)).toEqual(expected);
    expect((await loadStore()).getState().cosmetics).toEqual(expected);
  });

  it.each(['{broken', 'null', '42', '[]', '"classic"'])(
    'defaults every cosmetic field for invalid saved data %s',
    async (stored) => {
      localStorage.setItem('coredump.cosmetics', stored);
      expect((await loadStore()).getState().cosmetics).toEqual(DEFAULT_COSMETICS);
      localStorage.setItem('coredump.cosmetics', JSON.stringify({ palette: 'okabe-ito' }));
      expect((await loadStore()).getState().cosmetics.palette).toBe('okabe-ito');
    },
  );

  it.each([{ palette: 'okabe-ito' }, { cursor: 42, chain: null, palette: 'okabe-ito' }])(
    'defaults only missing or non-string fields in %j',
    async (stored) => {
      localStorage.setItem('coredump.cosmetics', JSON.stringify(stored));
      expect((await loadStore()).getState().cosmetics).toEqual({
        ...DEFAULT_COSMETICS,
        palette: 'okabe-ito',
      });
    },
  );

  it('preserves unknown selections for runtime unlock resolution', async () => {
    const store = await loadStore();
    // resolveCosmetic, not device persistence, decides what the profile can use.
    store.getState().selectCosmetic('cursor', 'future-cursor');
    expect(store.getState().cosmetics.cursor).toBe('future-cursor');
    expect((await loadStore()).getState().cosmetics.cursor).toBe('future-cursor');
  });

  it('resets cosmetic choices and removes their persisted value', async () => {
    const store = await loadStore();
    store.getState().selectCosmetic('palette', 'okabe-ito');
    expect(localStorage.getItem('coredump.cosmetics')).not.toBeNull();
    store.getState().resetSettings();
    expect(store.getState().cosmetics).toEqual(DEFAULT_COSMETICS);
    expect(localStorage.getItem('coredump.cosmetics')).toBeNull();
    expect((await loadStore()).getState().cosmetics).toEqual(DEFAULT_COSMETICS);
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

  it('defaults to Italian on a browser with no stored language', async () => {
    const store = await loadStore();
    const { i18n } = await import('@/i18n');

    expect(store.getState().language).toBe('it');
    expect(i18n.language).toBe('it');
    expect(document.documentElement.lang).toBe('it');
  });

  it('ignores a stored language the game does not ship', async () => {
    localStorage.setItem('coredump.language', 'fr');

    const store = await loadStore();

    expect(store.getState().language).toBe('it');
  });

  it('switches the UI language and reads the choice back on the next visit', async () => {
    const store = await loadStore();
    const { i18n } = await import('@/i18n');

    store.getState().setLanguage('en');

    expect(store.getState().language).toBe('en');
    expect(localStorage.getItem('coredump.language')).toBe('en');
    expect(i18n.t('menu.settings')).toBe('Settings');
    expect(document.documentElement.lang).toBe('en');

    const reopened = await loadStore();
    expect(reopened.getState().language).toBe('en');
  });

  it('puts sound, nickname and tutorial back to their defaults when the device is erased', async () => {
    const store = await loadStore();
    store.getState().toggleMuted();
    store.getState().setNickname('trinity');
    store.getState().markTutorialSeen();

    store.getState().resetSettings();

    expect(store.getState()).toMatchObject({ muted: false, nickname: '', tutorialSeen: false });
  });

  it('puts the language back to Italian when the device is erased', async () => {
    const store = await loadStore();
    const { i18n } = await import('@/i18n');
    store.getState().setLanguage('en');

    store.getState().resetSettings();

    expect(store.getState().language).toBe('it');
    expect(localStorage.getItem('coredump.language')).toBeNull();
    expect(i18n.t('menu.settings')).toBe('Impostazioni');
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
