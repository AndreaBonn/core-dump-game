import { describe, expect, it } from 'vitest';
import { PACKET_RADIUS } from '@/config/constants';
import { armorRingRadii } from '@/engine/systems/MechanicRenderer';

describe('armor ring geometry', () => {
  it('removes both outlines when the armor is cracked', () => {
    expect(armorRingRadii(1)).toEqual([PACKET_RADIUS * 0.9, PACKET_RADIUS * 0.7]);
    expect(armorRingRadii(0)).toEqual([]);
  });

  it('adds a distinct pair of inset outlines per armor level', () => {
    const radii = armorRingRadii(2, 10);
    expect(radii).toHaveLength(4);
    [9, 7, 5, 3].forEach((radius, index) => expect(radii[index]).toBeCloseTo(radius));
  });

  it('scales the outlines with the packet pop animation', () => {
    expect(armorRingRadii(1, PACKET_RADIUS / 2)).toEqual([
      PACKET_RADIUS * 0.45,
      PACKET_RADIUS * 0.35,
    ]);
    expect(armorRingRadii(1, 0)).toEqual([0, 0]);
  });
});
