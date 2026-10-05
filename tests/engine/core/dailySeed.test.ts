import { describe, expect, it } from 'vitest';
import { dailySeed } from '@/engine/core/dailySeed';

describe('dailySeed', () => {
  it('returns the same seed for the same calendar day regardless of time', () => {
    const morning = dailySeed(new Date(2026, 6, 22, 8, 0, 0));
    const evening = dailySeed(new Date(2026, 6, 22, 23, 59, 59));
    expect(morning).toBe(evening);
  });

  it('returns different seeds for different days', () => {
    const day1 = dailySeed(new Date(2026, 6, 22));
    const day2 = dailySeed(new Date(2026, 6, 23));
    expect(day1).not.toBe(day2);
  });

  it('produces an unsigned 32-bit integer', () => {
    const seed = dailySeed(new Date(2026, 0, 1));
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });

  it('keeps the seed a given date has always had, so every player gets the same layout', () => {
    // Known answer: changing it reshuffles the daily board for everyone and
    // splits the day's leaderboard between two layouts.
    expect(dailySeed(new Date(2026, 11, 31))).toBe(3785533686);
  });
});
