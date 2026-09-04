import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  isCampaignPerfect,
  isLevelUnlocked,
  recordLevel,
  starsOf,
  totalStars,
} from '@/engine/core/progress';
import { TOTAL_LEVELS } from '@/config/levels';

describe('recordLevel', () => {
  it('stores the stars and unlocks the next level', () => {
    const progress = recordLevel(EMPTY_PROGRESS, 1, 2);

    expect(starsOf(progress, 1)).toBe(2);
    expect(isLevelUnlocked(progress, 2)).toBe(true);
    expect(isLevelUnlocked(progress, 3)).toBe(false);
  });

  it('improves a rating on a replay', () => {
    const progress = recordLevel(recordLevel(EMPTY_PROGRESS, 1, 1), 1, 3);

    expect(starsOf(progress, 1)).toBe(3);
  });

  it('never takes stars away after a worse replay', () => {
    const progress = recordLevel(recordLevel(EMPTY_PROGRESS, 1, 3), 1, 1);

    expect(starsOf(progress, 1)).toBe(3);
  });

  it('does not lock levels the player already reached', () => {
    const far = recordLevel(EMPTY_PROGRESS, 5, 1);

    const replayed = recordLevel(far, 1, 3);

    expect(replayed.unlockedThrough).toBe(far.unlockedThrough);
  });

  it('stops unlocking past the last campaign level', () => {
    const progress = recordLevel(EMPTY_PROGRESS, TOTAL_LEVELS, 3);

    expect(progress.unlockedThrough).toBe(TOTAL_LEVELS);
  });

  it('ignores levels outside the campaign, where endless runs live', () => {
    expect(recordLevel(EMPTY_PROGRESS, TOTAL_LEVELS + 5, 3)).toBe(EMPTY_PROGRESS);
    expect(recordLevel(EMPTY_PROGRESS, 0, 3)).toBe(EMPTY_PROGRESS);
  });

  it('leaves the progress it was given untouched', () => {
    const before = EMPTY_PROGRESS;

    recordLevel(before, 2, 3);

    expect(starsOf(before, 2)).toBe(0);
  });
});

describe('totalStars and isCampaignPerfect', () => {
  it('adds up the stars earned', () => {
    const progress = recordLevel(recordLevel(EMPTY_PROGRESS, 1, 3), 2, 2);

    expect(totalStars(progress)).toBe(5);
  });

  it('is perfect only with three stars on every level', () => {
    let progress = EMPTY_PROGRESS;
    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      progress = recordLevel(progress, level, 3);
    }
    expect(isCampaignPerfect(progress)).toBe(true);

    expect(isCampaignPerfect(recordLevel(EMPTY_PROGRESS, 1, 3))).toBe(false);
  });
});
