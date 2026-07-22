import { describe, expect, it } from 'vitest';
import { easeInQuad, easeOutBack, easeOutCubic } from '@/engine/math/easing';

describe('easeOutCubic', () => {
  it('pins the endpoints and clamps out-of-range input', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('decelerates: is already past halfway at t=0.5', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('easeOutBack', () => {
  it('pins the endpoints', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  it('overshoots past 1 before settling', () => {
    const peak = Math.max(...[0.6, 0.7, 0.8].map(easeOutBack));
    expect(peak).toBeGreaterThan(1);
  });
});

describe('easeInQuad', () => {
  it('pins the endpoints and accelerates: stays below halfway at t=0.5', () => {
    expect(easeInQuad(0)).toBe(0);
    expect(easeInQuad(1)).toBe(1);
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
  });
});
