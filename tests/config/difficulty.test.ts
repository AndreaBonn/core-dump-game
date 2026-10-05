import { describe, expect, it } from 'vitest';
import { difficultyIndex } from '@/config/difficulty';
import { buildLevelConfig, type LevelConfig } from '@/config/levels';

const BASE = buildLevelConfig(1, 12345);
const INCREASES: readonly [string, Partial<LevelConfig>][] = [
  ['chainLength', { chainLength: BASE.chainLength + 4 }],
  ['chainSpeed', { chainSpeed: BASE.chainSpeed + 5 }],
  ['colorCount', { colorCount: BASE.colorCount + 1 }],
  ['hazardChance', { hazardChance: 0.02 }],
  ['armorChance', { armorChance: 0.02 }],
  ['reversal', { reversal: { period: 8, duration: 1.5, factor: -0.5 } }],
  ['waves', { waves: 2 }],
];

describe('difficulty index', () => {
  it.each(INCREASES)('increases when %s increases alone', (_, increase) => {
    expect(difficultyIndex({ ...BASE, ...increase })).toBeGreaterThan(difficultyIndex(BASE));
  });

  it('returns a deterministic finite positive index without mutating the config', () => {
    const config = Object.freeze({ ...BASE });
    const result = difficultyIndex(config);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
    expect(difficultyIndex({ ...config })).toBe(result);
    expect(config).toEqual(BASE);
  });
});
