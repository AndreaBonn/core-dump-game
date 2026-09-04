import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import type { RunResult } from '@/types/game.types';

const STORAGE_KEY = 'coredump.progress';

async function loadStore() {
  vi.resetModules();
  const module = await import('@/store/useProgressStore');
  return module.useProgressStore;
}

function run(overrides: Partial<RunResult> = {}): RunResult {
  return {
    mode: 'campaign',
    score: 500,
    levelReached: 3,
    levelScore: 200,
    won: false,
    ...overrides,
  };
}

describe('useProgressStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts empty on a fresh browser', async () => {
    const store = await loadStore();

    expect(store.getState().stats.runsPlayed).toBe(0);
    expect(store.getState().progress.unlockedThrough).toBe(1);
    expect(store.getState().earned).toEqual([]);
  });

  it('survives a reload', async () => {
    const store = await loadStore();
    store.getState().recordRunEnd(run({ score: 1234 }));

    const reopened = await loadStore();

    expect(reopened.getState().stats.bestScore.campaign).toBe(1234);
    expect(reopened.getState().stats.runsPlayed).toBe(1);
  });

  it('awards stars for a campaign level and unlocks the next one', async () => {
    const store = await loadStore();
    const [, , three] = getLevel(1).starThresholds;

    store.getState().recordLevelResult(1, three);

    expect(store.getState().progress.stars[1]).toBe(3);
    expect(store.getState().progress.unlockedThrough).toBe(2);
  });

  it('counts a cleared endless level without inventing a campaign rating', async () => {
    const store = await loadStore();

    store.getState().recordLevelResult(TOTAL_LEVELS + 4, 9999);

    expect(store.getState().stats.levelsCleared).toBe(1);
    expect(store.getState().progress.stars).toEqual({});
    expect(store.getState().progress.unlockedThrough).toBe(1);
  });

  it('unlocks achievements as the state earns them, once each', async () => {
    const store = await loadStore();

    store.getState().recordRunEnd(run());
    expect(store.getState().earned).toContain('hello-world');
    expect(store.getState().pending).toContain('hello-world');

    store.getState().recordRunEnd(run());
    expect(store.getState().earned.filter((id) => id === 'hello-world')).toHaveLength(1);
  });

  it('keeps a pending achievement until it is dismissed', async () => {
    const store = await loadStore();
    store.getState().noteCombo(4);

    expect(store.getState().pending).toContain('kernel-panic');
    store.getState().dismissPending('kernel-panic');

    expect(store.getState().pending).not.toContain('kernel-panic');
    // Dismissing the toast does not un-earn it.
    expect(store.getState().earned).toContain('kernel-panic');
  });

  it('starts clean when the saved profile is corrupt, instead of failing to load', async () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json');

    const store = await loadStore();

    expect(store.getState().stats.runsPlayed).toBe(0);
  });

  it('fills in fields a profile saved by an older version does not have', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats: { runsPlayed: 7 } }));

    const store = await loadStore();

    expect(store.getState().stats.runsPlayed).toBe(7);
    expect(store.getState().stats.bestScore.campaign).toBe(0);
    expect(store.getState().progress.unlockedThrough).toBe(1);
  });

  it('still works when localStorage refuses to store anything', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const store = await loadStore();

    expect(() => store.getState().recordRunEnd(run())).not.toThrow();
    expect(store.getState().stats.runsPlayed).toBe(1);
  });

  it('fills in a mode missing from a profile saved before it existed', async () => {
    // The regression this guards: a shallow spread replaced the whole record
    // with the partial one, the first Math.max hit undefined, and that mode's
    // best became NaN for the rest of the profile's life.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stats: { runsPlayed: 3, bestScore: { campaign: 500 } } }),
    );
    const store = await loadStore();

    store.getState().recordRunEnd(run({ mode: 'endless', score: 100 }));

    expect(store.getState().stats.bestScore.endless).toBe(100);
    expect(store.getState().stats.bestScore.campaign).toBe(500);
    expect(Number.isNaN(store.getState().stats.bestScore.daily)).toBe(false);
  });

  it('drops values a hand-edited profile could not have produced', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        progress: { stars: { 1: 7, 2: -1, notALevel: 3 }, unlockedThrough: -5 },
        stats: { runsPlayed: 'many', bestCombo: Number.POSITIVE_INFINITY },
        earned: ['hello-world', 42],
      }),
    );
    const store = await loadStore();

    expect(store.getState().progress.stars).toEqual({});
    expect(store.getState().progress.unlockedThrough).toBe(1);
    expect(store.getState().stats.runsPlayed).toBe(0);
    expect(store.getState().stats.bestCombo).toBe(0);
    expect(store.getState().earned).toEqual(['hello-world']);
  });

  it('clears the profile on request', async () => {
    const store = await loadStore();
    store.getState().recordRunEnd(run());

    store.getState().clearProfile();

    expect(store.getState().stats.runsPlayed).toBe(0);
    expect(store.getState().earned).toEqual([]);
  });
});
