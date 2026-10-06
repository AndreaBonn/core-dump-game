import { describe, expect, it } from 'vitest';
import { rankFor, RANK_THRESHOLDS } from '@/engine/core/ranks';

const EXPECTED_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000, 20000];
const EXPECTED_IDS = [
  'script-kiddie',
  'intern',
  'junior-dev',
  'sysadmin',
  'devops',
  'sre',
  'kernel-hacker',
  'root',
];

describe('rankFor', () => {
  it('keeps the eight rank thresholds stable', () => {
    expect(RANK_THRESHOLDS).toEqual(EXPECTED_THRESHOLDS);
  });

  it.each(EXPECTED_THRESHOLDS.map((threshold, index) => ({ threshold, index })))(
    'enters rank $index at exactly $threshold XP',
    ({ threshold, index }) => {
      expect(rankFor(threshold)).toEqual({
        index: index + 1,
        id: EXPECTED_IDS[index],
        threshold,
        nextThreshold: EXPECTED_THRESHOLDS[index + 1] ?? null,
        progress: index === EXPECTED_THRESHOLDS.length - 1 ? 1 : 0,
      });
    },
  );

  it.each(EXPECTED_THRESHOLDS.slice(1).map((threshold, index) => ({ threshold, index })))(
    'stays in the preceding rank one XP below $threshold',
    ({ threshold, index }) => {
      expect(rankFor(threshold - 1).index).toBe(index + 1);
    },
  );

  it.each([-10, NaN, -Infinity])('returns the first rank with zero progress for %s', (xp) => {
    expect(rankFor(xp)).toEqual(rankFor(0));
    expect(rankFor(xp).index).toBe(1);
    expect(rankFor(xp).progress).toBe(0);
  });

  it('measures progress relative to the current rank thresholds', () => {
    expect(rankFor(250).progress).toBe(0.5);
    expect(rankFor(2250).progress).toBe(0.5);
  });

  it.each([20000, 25000, Infinity])('keeps the final rank complete at %s XP', (xp) => {
    expect(rankFor(xp).index).toBe(8);
    expect(rankFor(xp).nextThreshold).toBeNull();
    expect(rankFor(xp).progress).toBe(1);
  });

  // 30 clears, 60 stars, 5 bosses and ~10 achievements yield 8250 XP; rank 8 needs replays or endless.
  it('places a two-star campaign completion at rank six', () => {
    expect(rankFor(8250).index).toBe(6);
    expect(rankFor(8250).threshold).toBe(8000);
  });
});
