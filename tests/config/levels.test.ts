import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/config/campaign';
import {
  buildLevelConfig,
  campaignChapters,
  getLevel,
  LEVELS,
  nextChapterAfterBoss,
  TOTAL_LEVELS,
} from '@/config/levels';

describe('level configuration', () => {
  it('keeps endless levels outside chapters with no new mechanics', () => {
    expect(buildLevelConfig(25, 12345)).toMatchObject({
      chapter: null,
      isBoss: false,
      armorChance: 0,
      reversal: null,
      waves: 1,
    });
  });

  it('provides exactly TOTAL_LEVELS levels', () => {
    expect(LEVELS).toHaveLength(TOTAL_LEVELS);
    expect(TOTAL_LEVELS).toBe(30);
  });

  it('clamps requested level to the valid range', () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(999).level).toBe(TOTAL_LEVELS);
    expect(getLevel(3).level).toBe(3);
  });

  // The authored speed is the pace on a spiral; the built level rescales it to
  // its track (tests/config/trackPace.test.ts), so the curve is read from the spec.
  it.each(CHAPTERS)('increases the authored chain speed within chapter $id', ({ levels }) => {
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!.chainSpeed).toBeGreaterThan(levels[i - 1]!.chainSpeed);
    }
  });

  it.each(CHAPTERS)('increases chain length monotonically within chapter $id', ({ id }) => {
    const levels = LEVELS.filter(({ chapter }) => chapter === id);
    expect(levels).toHaveLength(CHAPTERS.find((chapter) => chapter.id === id)!.levels.length);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!.chainLength).toBeGreaterThan(levels[i - 1]!.chainLength);
    }
  });

  it('starts the hazard chapter below the previous boss at the previous fifth level tuning', () => {
    const [base, hazard] = [CHAPTERS[0]!.levels, CHAPTERS[1]!.levels];
    expect(base[5]).toMatchObject({ chainLength: 48, chainSpeed: 57 });
    expect(hazard[0]).toMatchObject({ chainLength: 36, chainSpeed: 46 });
    expect(hazard[0]!.chainLength).toBe(base[4]!.chainLength);
    expect(hazard[0]!.chainSpeed).toBe(base[4]!.chainSpeed);
  });

  it('starts at 4 colours and grows to at most 7', () => {
    expect(getLevel(1).colorCount).toBe(4);
    expect(getLevel(TOTAL_LEVELS).colorCount).toBeLessThanOrEqual(7);
    expect(getLevel(TOTAL_LEVELS).colorCount).toBeGreaterThan(getLevel(1).colorCount);
  });

  it('makes the first three levels visibly different in speed, length or colours', () => {
    const [l1, l2, l3] = [getLevel(1), getLevel(2), getLevel(3)];
    expect(l1.chainSpeed).not.toBe(l2.chainSpeed);
    expect(l2.chainSpeed).not.toBe(l3.chainSpeed);
    expect(l1.chainLength).not.toBe(l3.chainLength);
  });

  it('builds a non-trivial spiral path for every level', () => {
    for (const level of LEVELS) {
      expect(level.waypoints.length).toBeGreaterThan(2);
    }
  });
});

describe('campaignChapters', () => {
  it('groups every campaign level under its own chapter, in chapter order', () => {
    const groups = campaignChapters();

    expect(groups.map((group) => group.chapterId)).toEqual(CHAPTERS.map((chapter) => chapter.id));
    for (const group of groups) {
      const spec = CHAPTERS.find((chapter) => chapter.id === group.chapterId)!;
      expect(group.mechanic).toBe(spec.mechanic);
      expect(group.levels).toHaveLength(spec.levels.length);
      expect(group.levels.every((level) => level.chapter === group.chapterId)).toBe(true);
    }
  });

  it('marks only the last level of each group as the boss', () => {
    for (const group of campaignChapters()) {
      const bossCount = group.levels.filter((level) => level.isBoss).length;
      expect(bossCount).toBe(1);
      expect(group.levels[group.levels.length - 1]!.isBoss).toBe(true);
    }
  });
});

describe('nextChapterAfterBoss', () => {
  it('returns the following chapter when a boss level is cleared', () => {
    expect(getLevel(6).isBoss).toBe(true);

    expect(nextChapterAfterBoss(6)).toEqual(CHAPTERS[1]);
  });

  it('returns null on a level that is not a boss', () => {
    expect(nextChapterAfterBoss(5)).toBeNull();
  });

  it('returns null after the last chapter, which has no successor', () => {
    expect(getLevel(TOTAL_LEVELS).isBoss).toBe(true);

    expect(nextChapterAfterBoss(TOTAL_LEVELS)).toBeNull();
  });
});
