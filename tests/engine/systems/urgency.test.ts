import { describe, expect, it } from 'vitest';
import { frontUrgency } from '@/engine/systems/urgency';

const PATH = 500;
const THRESHOLD = 132;

describe('frontUrgency', () => {
  it('is 0 while the front is outside the danger zone', () => {
    expect(frontUrgency(100, PATH, THRESHOLD)).toBe(0);
  });

  it('is 0 for an empty chain (front at negative infinity)', () => {
    expect(frontUrgency(Number.NEGATIVE_INFINITY, PATH, THRESHOLD)).toBe(0);
  });

  it('ramps to ~0.5 at the middle of the danger zone', () => {
    const midway = PATH - THRESHOLD / 2;
    expect(frontUrgency(midway, PATH, THRESHOLD)).toBeCloseTo(0.5);
  });

  it('reaches 1 when the front hits the path end', () => {
    expect(frontUrgency(PATH, PATH, THRESHOLD)).toBe(1);
  });

  it('clamps to 1 past the path end', () => {
    expect(frontUrgency(PATH + 40, PATH, THRESHOLD)).toBe(1);
  });
});
