import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS, TOTAL_LEVELS } from '@/config/levels';

describe('level configuration', () => {
  it('provides exactly TOTAL_LEVELS levels', () => {
    expect(LEVELS).toHaveLength(TOTAL_LEVELS);
    expect(TOTAL_LEVELS).toBe(10);
  });

  it('clamps requested level to the valid range', () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(999).level).toBe(TOTAL_LEVELS);
    expect(getLevel(3).level).toBe(3);
  });

  it('increases chain speed monotonically across levels', () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.chainSpeed).toBeGreaterThan(LEVELS[i - 1]!.chainSpeed);
    }
  });

  it('increases chain length monotonically across levels', () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.chainLength).toBeGreaterThan(LEVELS[i - 1]!.chainLength);
    }
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
