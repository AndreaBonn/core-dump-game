import { describe, expect, it } from 'vitest';
import { campaignConfig, dailyConfig, endlessConfig } from '@/engine/core/runController';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';

describe('campaignConfig', () => {
  it('reproduces getLevel exactly for every campaign level (parity guard)', () => {
    const { levelProvider } = campaignConfig();
    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      const provided = levelProvider(level)!;
      const expected = getLevel(level);
      expect(provided.seed).toBe(expected.seed);
      expect(provided.chainLength).toBe(expected.chainLength);
      expect(provided.chainSpeed).toBe(expected.chainSpeed);
      expect(provided.colorCount).toBe(expected.colorCount);
      expect(provided.waypoints.length).toBe(expected.waypoints.length);
    }
  });

  it('returns null past the final level so the run is won', () => {
    const { levelProvider } = campaignConfig();
    expect(levelProvider(TOTAL_LEVELS)).not.toBeNull();
    expect(levelProvider(TOTAL_LEVELS + 1)).toBeNull();
  });

  it('starts from level 1 and ends at the final level', () => {
    const config = campaignConfig();
    expect(config.startIndex).toBe(1);
    expect(config.finalLevel).toBe(TOTAL_LEVELS);
  });
});

describe('endlessConfig', () => {
  it('never returns null, extrapolating past the campaign', () => {
    const { levelProvider } = endlessConfig();
    expect(levelProvider(TOTAL_LEVELS + 5)).not.toBeNull();
    expect(levelProvider(50)!.level).toBe(50);
  });

  it('is an endless run with no final level', () => {
    expect(endlessConfig().finalLevel).toBeNull();
    expect(dailyConfig(new Date(2026, 6, 22)).finalLevel).toBeNull();
  });

  it('caps difficulty so far levels stay playable', () => {
    const { levelProvider } = endlessConfig();
    const far = levelProvider(200)!;
    expect(far.chainSpeed).toBeLessThanOrEqual(220);
    expect(far.chainLength).toBeLessThanOrEqual(160);
    expect(far.colorCount).toBeLessThanOrEqual(7);
  });

  it('reproduces the same sequence for the same seed and differs across seeds', () => {
    const a = endlessConfig(42).levelProvider(3)!;
    const b = endlessConfig(42).levelProvider(3)!;
    const c = endlessConfig(99).levelProvider(3)!;
    expect(a.seed).toBe(b.seed);
    expect(a.seed).not.toBe(c.seed);
  });
});

describe('dailyConfig', () => {
  it('gives the same layout for the same date and a different one for another date', () => {
    const today = dailyConfig(new Date(2026, 6, 22)).levelProvider(1)!;
    const sameDay = dailyConfig(new Date(2026, 6, 22)).levelProvider(1)!;
    const otherDay = dailyConfig(new Date(2026, 6, 23)).levelProvider(1)!;
    expect(today.seed).toBe(sameDay.seed);
    expect(today.seed).not.toBe(otherDay.seed);
  });

  it('is an unbounded run (never null)', () => {
    const { levelProvider } = dailyConfig(new Date(2026, 6, 22));
    expect(levelProvider(30)).not.toBeNull();
  });
});
