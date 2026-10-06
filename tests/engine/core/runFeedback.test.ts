import { describe, expect, it } from 'vitest';
import { buildRunResult, comboHitStop } from '@/engine/core/runFeedback';
import { campaignConfig, endlessConfig } from '@/engine/core/runController';

describe('buildRunResult', () => {
  it('distinguishes winning from losing on the final campaign level', () => {
    const config = campaignConfig();
    expect(buildRunResult(config, 900, 24, { levelScore: 120, won: true })).toEqual({
      mode: 'campaign',
      score: 900,
      levelReached: 24,
      levelScore: 120,
      won: true,
    });
    expect(buildRunResult(config, 900, 24, { levelScore: 120, won: false }).won).toBe(false);
  });

  it('preserves the run mode and zero scores', () => {
    expect(buildRunResult(endlessConfig(), 0, 1, { levelScore: 0, won: false })).toEqual({
      mode: 'endless',
      score: 0,
      levelReached: 1,
      levelScore: 0,
      won: false,
    });
  });
});

describe('comboHitStop', () => {
  it('holds large combos and caps multipliers at the last duration', () => {
    expect(comboHitStop(0, 3, false)).toBe(10);
    expect(comboHitStop(0, 100, false)).toBe(16);
  });

  it('preserves a longer active hold', () => {
    expect(comboHitStop(8, 2, false)).toBe(8);
  });

  it('disables new holds for reduced motion and small combos', () => {
    expect(comboHitStop(0, 3, false)).toBe(10);
    expect(comboHitStop(0, 3, true)).toBe(0);
    expect(comboHitStop(0, 1, false)).toBe(0);
  });
});
