import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { getLevel } from '@/config/levels';
import type { SavedProfile } from '@/engine/core/profileMerge';
import { EMPTY_STATS } from '@/engine/core/stats';
import { xpFor } from '@/engine/core/xp';
import { useMetaProgress } from '@/hooks/useMetaProgress';
import { useProgressStore } from '@/store/useProgressStore';

const FIRST_LEVEL = 1;
const FIRST_BOSS_LEVEL = 6;
const ONE_STAR_SCORE = getLevel(FIRST_LEVEL).starThresholds[0];
const THREE_STAR_SCORE = getLevel(FIRST_LEVEL).starThresholds[2];
const BOSS_ONE_STAR_SCORE = getLevel(FIRST_BOSS_LEVEL).starThresholds[0];

describe('useMetaProgress', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().clearProfile();
  });

  it('starts at zero XP and rank one for an empty profile', () => {
    const { result } = renderHook(() => useMetaProgress());

    expect(result.current.xp).toBe(0);
    expect(result.current.rank.index).toBe(1);
  });

  it('updates XP when the real store records a campaign level', () => {
    const { result } = renderHook(() => useMetaProgress());

    act(() =>
      useProgressStore.getState().recordLevelResult(FIRST_LEVEL, ONE_STAR_SCORE, 'campaign'),
    );

    expect(result.current.xp).toBeGreaterThan(0);
  });

  it('returns to zero XP and rank one after clearing a progressed profile', () => {
    const { result } = renderHook(() => useMetaProgress());
    act(() =>
      useProgressStore
        .getState()
        .recordLevelResult(FIRST_BOSS_LEVEL, BOSS_ONE_STAR_SCORE, 'campaign'),
    );
    expect(result.current.xp).toBe(600);
    expect(result.current.rank.index).toBe(2);

    act(() => useProgressStore.getState().clearProfile());

    expect(result.current.xp).toBe(0);
    expect(result.current.rank.index).toBe(1);
  });

  it('reflects field-wise maxima when hydrating a profile from the same reset', () => {
    const { result } = renderHook(() => useMetaProgress());
    act(() =>
      useProgressStore.getState().recordLevelResult(FIRST_LEVEL, THREE_STAR_SCORE, 'campaign'),
    );
    const before = result.current.xp;
    const file: SavedProfile = {
      stats: { ...EMPTY_STATS, levelsCleared: 5 },
      progress: { stars: { 1: 1, 6: 1 }, unlockedThrough: 7 },
      earned: ['first-commit', 'boss-down'],
      resetAt: useProgressStore.getState().resetAt,
    };
    const fileXp = xpFor(file);
    expect(before).toBe(400);
    expect(fileXp).toBe(1050);

    act(() => useProgressStore.getState().hydrateFromFile(JSON.stringify(file)));

    expect(result.current.xp).toBeGreaterThanOrEqual(before);
    expect(result.current.xp).toBeGreaterThanOrEqual(fileXp);
    expect(result.current.xp).toBe(1225);
    expect(result.current.rank.index).toBe(2);
    expect(useProgressStore.getState().stats.levelsCleared).toBe(5);
    expect(useProgressStore.getState().progress.stars).toEqual({ 1: 3, 6: 1 });
  });

  it('keeps the memoized result when only pending achievements change', () => {
    const { result, rerender } = renderHook(() => useMetaProgress());
    act(() =>
      useProgressStore.getState().recordLevelResult(FIRST_LEVEL, ONE_STAR_SCORE, 'campaign'),
    );
    const before = result.current;
    expect(useProgressStore.getState().pending).toContain('first-commit');

    act(() => useProgressStore.getState().dismissPending('first-commit'));
    rerender();

    expect(useProgressStore.getState().pending).toEqual([]);
    expect(result.current).toBe(before);
  });
});
