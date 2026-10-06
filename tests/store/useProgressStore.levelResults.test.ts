import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import { starsOf } from '@/engine/core/progress';
import type { RunResult } from '@/types/game.types';

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

describe('useProgressStore level results by mode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it.each(['endless', 'daily', 'tutorial'] as const)(
    'counts level 3 in %s without changing campaign progress',
    async (mode) => {
      const store = await loadStore();
      const [, , three] = getLevel(3).starThresholds;
      const progress = store.getState().progress;

      store.getState().recordLevelResult(3, three, mode);

      expect(store.getState().stats.levelsCleared).toBe(1);
      expect(store.getState().progress).toEqual({ stars: {}, unlockedThrough: 1 });
      expect(store.getState().progress).toBe(progress);
    },
  );

  it('awards three stars and counts the final level on a campaign win', async () => {
    const store = await loadStore();

    store.getState().recordRunEnd(
      run({
        won: true,
        levelReached: TOTAL_LEVELS,
        levelScore: getLevel(TOTAL_LEVELS).starThresholds[2],
      }),
    );

    expect(starsOf(store.getState().progress, TOTAL_LEVELS)).toBe(3);
    expect(store.getState().stats.levelsCleared).toBe(1);
    expect(store.getState().stats.runsWon).toBe(1);
  });

  it.each([
    { mode: 'tutorial', won: true, runsPlayed: 0 },
    { mode: 'campaign', won: false, runsPlayed: 1 },
  ] as const)('keeps level progress unchanged for $mode with won=$won', async (result) => {
    const store = await loadStore();
    store.getState().recordLevelResult(1, getLevel(1).starThresholds[2], 'campaign');
    const { progress, stats } = store.getState();

    store.getState().recordRunEnd(
      run({
        mode: result.mode,
        won: result.won,
        levelReached: TOTAL_LEVELS,
        levelScore: getLevel(TOTAL_LEVELS).starThresholds[2],
      }),
    );

    expect(starsOf(store.getState().progress, TOTAL_LEVELS)).toBe(0);
    expect(starsOf(store.getState().progress, 1)).toBe(3);
    expect(store.getState().progress).toBe(progress);
    expect(store.getState().stats.levelsCleared).toBe(stats.levelsCleared);
    expect(store.getState().stats.runsPlayed).toBe(result.runsPlayed);
  });

  it('earns all-stars in the same update as the final campaign win', async () => {
    const store = await loadStore();
    for (let level = 1; level < TOTAL_LEVELS; level += 1) {
      store.getState().recordLevelResult(level, getLevel(level).starThresholds[2], 'campaign');
    }
    expect(store.getState().earned).not.toContain('all-stars');
    const updates = vi.fn();
    const unsubscribe = store.subscribe(updates);

    store.getState().recordRunEnd(
      run({
        won: true,
        levelReached: TOTAL_LEVELS,
        levelScore: getLevel(TOTAL_LEVELS).starThresholds[2],
      }),
    );
    unsubscribe();

    expect(updates).toHaveBeenCalledTimes(1);
    expect(store.getState().earned).toContain('all-stars');
    expect(store.getState().pending).toContain('all-stars');
    expect(store.getState().stats.levelsCleared).toBe(TOTAL_LEVELS);
    expect(store.getState().stats.runsWon).toBe(1);
  });
});

describe('useProgressStore references', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the earned list when an update earns nothing, so subscribers do not recompute', async () => {
    const store = await loadStore();
    store.getState().noteCombo(2);
    const earned = store.getState().earned;
    expect(earned.length).toBeGreaterThan(0);

    store.getState().noteCombo(2);

    expect(store.getState().earned).toBe(earned);
  });

  it('replaces the earned list when an update does earn something', async () => {
    const store = await loadStore();
    store.getState().noteCombo(2);
    const earned = store.getState().earned;

    store.getState().noteCombo(3);

    expect(store.getState().earned).not.toBe(earned);
    expect(store.getState().earned).toContain('stack-overflow');
  });
});
