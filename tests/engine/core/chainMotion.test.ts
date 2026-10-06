import { describe, expect, it } from 'vitest';
import { directionFactor } from '@/engine/core/chainMotion';

const schedule = { period: 8, duration: 1.5, factor: -0.5 };

describe('directionFactor', () => {
  it.each([
    [0, 1],
    [7.999, 1],
    [8, -0.5],
    [9.5, 1],
    [16.5, -0.5],
  ])('returns %s seconds as factor %s', (elapsed, expected) => {
    expect(directionFactor(elapsed, schedule)).toBe(expected);
  });

  it('keeps forward motion without a schedule', () => {
    expect(directionFactor(8, schedule)).toBe(-0.5);
    for (const elapsed of [0, 8, 100]) {
      expect(directionFactor(elapsed, null)).toBe(1);
    }
  });
});
