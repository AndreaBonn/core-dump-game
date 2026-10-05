import { describe, expect, it, vi } from 'vitest';
import { applyArmor, armorSeed } from '@/engine/core/armor';
import { dailySeed } from '@/engine/core/dailySeed';
import { createPacket } from '@/engine/entities/DataPacket';
import { createRng } from '@/engine/math/rng';

describe('armorSeed', () => {
  it.each([1, 42, 20260115, 0xffffffff])(
    'derives a deterministic unsigned sub-seed from %i',
    (seed) => {
      const derived = armorSeed(seed);

      expect(Number.isInteger(derived)).toBe(true);
      expect(derived).toBeGreaterThanOrEqual(0);
      expect(derived).toBeLessThanOrEqual(0xffffffff);
      expect(armorSeed(seed)).toBe(derived);
      expect(derived).not.toBe(seed);
    },
  );

  it('distinguishes neighboring seeds including zero', () => {
    const seeds = [0, 1, 2, 3].map(armorSeed);

    expect(new Set(seeds).size).toBe(4);
    expect(armorSeed(0)).toBe(seeds[0]);
  });

  it('uses a different hash from the daily seed for the same numeric input', () => {
    const date = new Date(2026, 0, 15);
    const derived = armorSeed(20260115);

    expect(armorSeed(20260115)).toBe(derived);
    expect(derived).not.toBe(dailySeed(date));
  });
});

describe('applyArmor', () => {
  it('copies selected packets without mutating the original array or packets', () => {
    const packets = [createPacket({ type: 'ERROR', distance: 32 })];
    const original = { ...packets[0]! };
    Object.freeze(packets[0]);
    Object.freeze(packets);

    const result = applyArmor(packets, 1, createRng(7));

    expect(result).toEqual([{ ...original, armor: 1 }]);
    expect(packets).toEqual([original]);
    expect(result).not.toBe(packets);
    expect(result[0]).not.toBe(packets[0]);
  });

  it('draws only for eligible packets and preserves skipped packet references', () => {
    const hazard = createPacket({ type: 'ERROR', distance: 0, matchable: false });
    const powerUp = createPacket({ type: 'INFO', distance: 32, powerUpType: 'SLEEP' });
    const selected = createPacket({ type: 'SUCCESS', distance: 64 });
    const skipped = createPacket({ type: 'WARNING', distance: 96 });
    const rng = createRng(7);
    const next = vi.spyOn(rng, 'next').mockReturnValueOnce(0.29).mockReturnValueOnce(0.3);

    const result = applyArmor([hazard, powerUp, selected, skipped], 0.3, rng);

    expect(result.map((p) => p.armor)).toEqual([0, 0, 1, 0]);
    expect(next).toHaveBeenCalledTimes(2);
    expect(result[0]).toBe(hazard);
    expect(result[1]).toBe(powerUp);
    expect(result[2]).toEqual({ ...selected, armor: 1 });
    expect(result[3]).toBe(skipped);
  });

  it('keeps eligible packets unchanged at zero probability', () => {
    const packet = createPacket({ type: 'ERROR', distance: 32 });

    const result = applyArmor([packet], 0, createRng(7));

    expect(result).toEqual([packet]);
    expect(result[0]).toBe(packet);
    expect(result[0]!.armor).toBe(0);
  });

  it('returns an empty array without drawing when there are no packets', () => {
    const rng = createRng(7);
    const next = vi.spyOn(rng, 'next');

    expect(applyArmor([], 1, rng)).toEqual([]);
    expect(next).toHaveBeenCalledTimes(0);
    expect(applyArmor([createPacket({ type: 'ERROR', distance: 0 })], 1, rng)[0]!.armor).toBe(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
