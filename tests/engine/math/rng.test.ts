import { describe, expect, it } from 'vitest';
import { createRng } from '@/engine/math/rng';

describe('createRng', () => {
  it('produces floats in the [0, 1) range', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic: the same seed yields the same sequence', () => {
    const a = Array.from({ length: 10 }, () => createRng(42).next());
    const b = Array.from({ length: 10 }, () => createRng(42).next());
    // Independent generators seeded identically must agree step for step.
    const seqA = [createRng(42), createRng(42)].map((r) => [r.next(), r.next(), r.next()]);
    expect(seqA[0]).toEqual(seqA[1]);
    expect(a[0]).toBe(b[0]);
  });

  it('diverges for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('int returns integers within [0, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.int(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('pick returns an element of the array', () => {
    const rng = createRng(99);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick throws on an empty array', () => {
    expect(() => createRng(1).pick([])).toThrow('Cannot pick from an empty array');
  });
});
