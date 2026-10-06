import { describe, expect, it } from 'vitest';
import { DEFAULT_COSMETICS, PALETTES } from '@/config/cosmetics';
import { colorForType, PACKET_TYPES } from '@/config/packetTypes';
import { DEFAULT_THEME, themeFor } from '@/engine/systems/theme';

describe('themeFor', () => {
  it('maps all packet types through the selected Okabe-Ito palette', () => {
    const theme = themeFor({ cursor: 'ring', chain: 'hex', palette: 'okabe-ito' });
    const palette = PALETTES.find(({ id }) => id === 'okabe-ito')!;
    for (const { type } of PACKET_TYPES) {
      expect(theme.packetColor(type)).toBe(palette.colors[type]);
    }
    expect(theme.cursor.id).toBe('ring');
    expect(theme.chain.id).toBe('hex');
  });

  it('uses classic for unknown palettes and preserves the exact default colors', () => {
    const unknown = themeFor({ ...DEFAULT_COSMETICS, palette: 'missing' });
    for (const { type } of PACKET_TYPES) {
      expect(unknown.packetColor(type)).toBe(colorForType(type));
      expect(DEFAULT_THEME.packetColor(type)).toBe(colorForType(type));
    }
    expect(DEFAULT_THEME.cursor.id).toBe(DEFAULT_COSMETICS.cursor);
    expect(DEFAULT_THEME.chain.id).toBe(DEFAULT_COSMETICS.chain);
  });

  it('keeps themes independent when selections are changed later', () => {
    const selection = { ...DEFAULT_COSMETICS, palette: 'okabe-ito' };
    const theme = themeFor(selection);
    const before = theme.packetColor('ERROR');
    selection.palette = 'classic';
    const classic = themeFor(selection);
    expect(theme.packetColor('ERROR')).toBe(before);
    expect(classic.packetColor('ERROR')).toBe(colorForType('ERROR'));
    expect(before).not.toBe(classic.packetColor('ERROR'));
  });
});
