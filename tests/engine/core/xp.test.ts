import { describe, expect, it } from 'vitest';
import { LEVELS } from '@/config/levels';
import { EMPTY_PROGRESS, totalStars, type CampaignProgress } from '@/engine/core/progress';
import { EMPTY_STATS } from '@/engine/core/stats';
import { xpFor } from '@/engine/core/xp';

const EMPTY_STATE = { stats: EMPTY_STATS, progress: EMPTY_PROGRESS, earned: [] };
const FIRST_BOSS_LEVEL = 6;
const UNCLEARED_BOSS_STARS: readonly CampaignProgress['stars'][] = [{}, { [FIRST_BOSS_LEVEL]: 0 }];

describe('xpFor', () => {
  it('returns zero for an empty profile', () => {
    expect(xpFor(EMPTY_STATE)).toBe(0);
  });

  it('awards 2875 XP for twelve clears, twenty stars, one boss and five achievements', () => {
    const progress: CampaignProgress = {
      stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 7: 3, 8: 1, [FIRST_BOSS_LEVEL]: 1 },
      unlockedThrough: 9,
    };
    const earned = ['hello-world', 'first-commit', 'sudo', 'boss-down', 'three-stars'];
    expect(LEVELS.find(({ level }) => level === FIRST_BOSS_LEVEL)?.isBoss).toBe(true);
    expect(totalStars(progress)).toBe(20);
    expect(
      LEVELS.filter(({ isBoss, level }) => isBoss && (progress.stars[level] ?? 0) >= 1),
    ).toHaveLength(1);

    expect(xpFor({ stats: { ...EMPTY_STATS, levelsCleared: 12 }, progress, earned })).toBe(2875);
  });

  it.each(UNCLEARED_BOSS_STARS)(
    'awards the 300 XP boss bonus only with a star, starting from %j',
    (bossStars) => {
      // Moving a star keeps the star XP fixed so the difference isolates the boss bonus.
      const uncleared: CampaignProgress = { stars: { ...bossStars, 1: 1 }, unlockedThrough: 7 };
      const cleared: CampaignProgress = {
        stars: { 1: 0, [FIRST_BOSS_LEVEL]: 1 },
        unlockedThrough: 7,
      };
      const before = xpFor({ ...EMPTY_STATE, progress: uncleared });
      const after = xpFor({ ...EMPTY_STATE, progress: cleared });

      expect(before).toBe(50);
      expect(after).toBe(350);
      expect(after - before).toBe(300);
    },
  );

  it('counts each earned achievement once', () => {
    const unique = xpFor({ ...EMPTY_STATE, earned: ['hello-world', 'sudo'] });
    const duplicates = xpFor({ ...EMPTY_STATE, earned: ['hello-world', 'hello-world', 'sudo'] });

    expect(unique).toBe(150);
    expect(duplicates - unique).toBe(0);
  });

  it('counts every starred campaign boss once regardless of its star rating', () => {
    const progress: CampaignProgress = {
      stars: { 6: 1, 12: 2, 18: 3, 24: 1, 30: 2 },
      unlockedThrough: 30,
    };

    expect(xpFor({ ...EMPTY_STATE, progress })).toBe(1950);
  });
});
