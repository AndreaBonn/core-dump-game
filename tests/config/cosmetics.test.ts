import { describe, expect, it } from 'vitest';
import { COSMETICS, PALETTES, type CosmeticSlot } from '@/config/cosmetics';
import { contrastRatio } from '@/config/contrast';
import { PACKET_TYPES, colorForType } from '@/config/packetTypes';
import { BACKGROUND, INK } from '@/engine/systems/RenderSystem';

const SLOTS: readonly CosmeticSlot[] = ['cursor', 'chain', 'palette'];

describe('cosmetics catalog', () => {
  it('has globally unique identifiers', () => {
    expect(new Set(COSMETICS.map(({ id }) => id)).size).toBe(COSMETICS.length);
  });

  it.each(SLOTS)('starts %s with an always-unlocked default and offers three choices', (slot) => {
    const items = COSMETICS.filter((item) => item.slot === slot);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0]?.unlock.kind).toBe('default');
  });

  it.each(PALETTES)('$id maps all seven types to distinct, readable colors', (palette) => {
    const colors = PACKET_TYPES.map(({ type }) => palette.colors[type]);
    expect(new Set(colors).size).toBe(7);
    for (const color of colors) {
      expect(contrastRatio(color, BACKGROUND)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(INK, color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('preserves the classic palette and never locks the accessibility palettes', () => {
    for (const { type } of PACKET_TYPES) {
      expect(PALETTES[0]!.colors[type]).toBe(colorForType(type));
    }
    // A colour-blind player needs these from the first level, not as a reward.
    for (const id of ['okabe-ito', 'high-contrast']) {
      expect(PALETTES.find((palette) => palette.id === id)?.unlock).toEqual({ kind: 'always' });
    }
  });

  it('keeps a palette to earn, so the palette slot still rewards play', () => {
    expect(
      PALETTES.some(({ unlock }) => unlock.kind !== 'default' && unlock.kind !== 'always'),
    ).toBe(true);
  });
});
