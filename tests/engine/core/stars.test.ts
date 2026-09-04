import { describe, expect, it } from 'vitest';
import { starsFor } from '@/engine/core/stars';
import { buildLevelConfig, CAMPAIGN_SEED_BASE, getLevel } from '@/config/levels';

describe('starsFor', () => {
  const thresholds = [100, 200, 300] as const;

  it('gives no star below the first threshold', () => {
    expect(starsFor(0, thresholds)).toBe(0);
    expect(starsFor(99, thresholds)).toBe(0);
  });

  it('gives a star on the threshold itself, not just above it', () => {
    expect(starsFor(100, thresholds)).toBe(1);
    expect(starsFor(200, thresholds)).toBe(2);
    expect(starsFor(300, thresholds)).toBe(3);
  });

  it('gives the star of the highest threshold reached', () => {
    expect(starsFor(150, thresholds)).toBe(1);
    expect(starsFor(299, thresholds)).toBe(2);
    expect(starsFor(10_000, thresholds)).toBe(3);
  });

  it('never goes below zero on a negative or broken score', () => {
    expect(starsFor(-50, thresholds)).toBe(0);
    expect(starsFor(Number.NaN, thresholds)).toBe(0);
  });
});

describe('star thresholds of a level', () => {
  it('are three increasing values on every campaign level', () => {
    for (let level = 1; level <= 10; level += 1) {
      const [one, two, three] = getLevel(level).starThresholds;

      expect(one).toBeGreaterThan(0);
      expect(two).toBeGreaterThan(one);
      expect(three).toBeGreaterThan(two);
    }
  });

  it('grow with the level, because a longer chain is worth more', () => {
    const first = getLevel(1).starThresholds;
    const last = getLevel(10).starThresholds;

    expect(last[2]).toBeGreaterThan(first[2]);
  });

  it('stay defined past the campaign, where endless and daily keep going', () => {
    const far = buildLevelConfig(45, CAMPAIGN_SEED_BASE);

    expect(far.starThresholds).toHaveLength(3);
    expect(far.starThresholds[2]).toBeGreaterThan(far.starThresholds[0]);
  });

  it('are reachable: three stars ask for less than a flawless combo-heavy run', () => {
    for (let level = 1; level <= 20; level += 1) {
      const config = buildLevelConfig(level, CAMPAIGN_SEED_BASE);
      // Every packet cleared in plain three-packet matches is worth 10 points
      // (30 per match). Three stars must sit above that but within reach of a
      // run that chains a few combos, so cap it at double.
      const plainClear = config.chainLength * 10;

      expect(config.starThresholds[2]).toBeGreaterThan(plainClear);
      expect(config.starThresholds[2]).toBeLessThanOrEqual(plainClear * 2);
    }
  });
});
