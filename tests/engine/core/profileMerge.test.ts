import { describe, expect, it } from 'vitest';
import { mergeProfiles, type SavedProfile } from '@/engine/core/profileMerge';
import { EMPTY_PROGRESS } from '@/engine/core/progress';
import { EMPTY_STATS } from '@/engine/core/stats';

function profile(overrides: Partial<SavedProfile> = {}): SavedProfile {
  return { progress: EMPTY_PROGRESS, stats: EMPTY_STATS, earned: [], resetAt: 0, ...overrides };
}

describe('mergeProfiles', () => {
  it('keeps the better star rating per level and every cleared level', () => {
    const browser = profile({ progress: { stars: { 1: 3, 2: 1 }, unlockedThrough: 3 } });
    const file = profile({ progress: { stars: { 2: 2, 5: 1 }, unlockedThrough: 6 } });

    const merged = mergeProfiles(browser, file);

    expect(merged.progress.stars).toEqual({ 1: 3, 2: 2, 5: 1 });
    expect(merged.progress.unlockedThrough).toBe(6);
  });

  it('takes the larger counter instead of adding the two', () => {
    const a = profile({ stats: { ...EMPTY_STATS, runsPlayed: 10, runsWon: 2, bestCombo: 4 } });
    const b = profile({ stats: { ...EMPTY_STATS, runsPlayed: 7, runsWon: 5, bestCombo: 6 } });

    const merged = mergeProfiles(a, b);

    expect(merged.stats.runsPlayed).toBe(10);
    expect(merged.stats.runsWon).toBe(5);
    expect(merged.stats.bestCombo).toBe(6);
  });

  it('keeps the best score of each mode separately', () => {
    const a = profile({
      stats: {
        ...EMPTY_STATS,
        bestScore: { ...EMPTY_STATS.bestScore, campaign: 900, endless: 10 },
      },
    });
    const b = profile({
      stats: {
        ...EMPTY_STATS,
        bestScore: { ...EMPTY_STATS.bestScore, campaign: 100, endless: 50 },
      },
    });

    const merged = mergeProfiles(a, b);

    expect(merged.stats.bestScore.campaign).toBe(900);
    expect(merged.stats.bestScore.endless).toBe(50);
  });

  it('unions achievements without duplicates', () => {
    const merged = mergeProfiles(
      profile({ earned: ['hello-world', 'combo'] }),
      profile({ earned: ['combo', 'daily'] }),
    );

    expect(merged.earned).toEqual(['hello-world', 'combo', 'daily']);
  });

  it('returns an equal profile when merged with an empty one', () => {
    const full = profile({
      progress: { stars: { 1: 2 }, unlockedThrough: 2 },
      stats: { ...EMPTY_STATS, runsPlayed: 3 },
      earned: ['hello-world'],
    });

    expect(mergeProfiles(full, profile())).toEqual(full);
    expect(mergeProfiles(profile(), full)).toEqual(full);
  });

  it('lets the side with the newer reset win whole, so a reset is not undone', () => {
    const stale = profile({
      progress: { stars: { 1: 3 }, unlockedThrough: 5 },
      earned: ['hello-world'],
    });
    const reset = profile({ resetAt: 1000 });

    expect(mergeProfiles(stale, reset)).toEqual(reset);
    expect(mergeProfiles(reset, stale)).toEqual(reset);
  });

  it('merges progress made after the same reset', () => {
    const a = profile({ resetAt: 1000, progress: { stars: { 1: 2 }, unlockedThrough: 2 } });
    const b = profile({ resetAt: 1000, progress: { stars: { 2: 1 }, unlockedThrough: 3 } });

    const merged = mergeProfiles(a, b);

    expect(merged.progress.stars).toEqual({ 1: 2, 2: 1 });
    expect(merged.resetAt).toBe(1000);
  });
});
