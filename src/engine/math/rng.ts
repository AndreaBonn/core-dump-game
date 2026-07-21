export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Random integer in [0, max). */
  int(max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** Deterministic mulberry32 PRNG. Seeding makes gameplay reproducible in tests. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty array');
      }
      return items[Math.floor(next() * items.length)]!;
    },
  };
}
