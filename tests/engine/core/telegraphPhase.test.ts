import { describe, expect, it } from 'vitest';
import { telegraphPhase } from '@/engine/core/chainMotion';

const schedule = { period: 8, duration: 1.5, factor: -0.5 };

describe('telegraphPhase', () => {
  it.each([
    [0, 0],
    [7.25, 0],
    [7.625, 0.5],
    [8, 1],
    [8.5, 1],
    [9.5, 0],
    [15.625, 0.5],
    [16, 1],
  ])('returns phase %s seconds as %s', (elapsed, expected) => {
    expect(telegraphPhase(elapsed, schedule)).toBe(expected);
  });

  it('hides the signal only when there is no upcoming reversal', () => {
    expect(telegraphPhase(8, schedule)).toBe(1);
    expect(telegraphPhase(8, null)).toBe(0);
  });

  it('keeps the signal active even when the scheduled factor is one', () => {
    expect(telegraphPhase(8, { ...schedule, factor: 1 })).toBe(1);
  });
});
