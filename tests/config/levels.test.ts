import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/config/campaign';
import { buildLevelConfig, getLevel, LEVELS, TOTAL_LEVELS } from '@/config/levels';

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
    expect(TOTAL_LEVELS).toBe(12);
  });

  it('clamps requested level to the valid range', () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(999).level).toBe(TOTAL_LEVELS);
    expect(getLevel(3).level).toBe(3);
  });

  it.each(CHAPTERS)('increases chain speed monotonically within chapter $id', ({ id }) => {
    const levels = LEVELS.filter(({ chapter }) => chapter === id);
    expect(levels).toHaveLength(CHAPTERS.find((chapter) => chapter.id === id)!.levels.length);
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
    expect(getLevel(6)).toMatchObject({ chainLength: 48, chainSpeed: 57 });
    expect(getLevel(7)).toMatchObject({ chainLength: 36, chainSpeed: 46 });
    expect(getLevel(7).chainLength).toBe(getLevel(5).chainLength);
    expect(getLevel(7).chainSpeed).toBe(getLevel(5).chainSpeed);
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
