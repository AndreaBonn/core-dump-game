import { describe, expect, it } from 'vitest';
import { DEFAULT_COSMETICS } from '@/config/cosmetics';
import { colorForType } from '@/config/packetTypes';
import { createPacket } from '@/engine/entities/DataPacket';
import { themeFor } from '@/engine/systems/theme';
import { createSessionBoard } from '../helpers/sessionBoard';

const SELECTED_THEME = themeFor({ ...DEFAULT_COSMETICS, palette: 'okabe-ito' });

describe('LevelSession theme', () => {
  it('colors shot impacts without changing the next seeded cursor draws', () => {
    const themed = createSessionBoard([]);
    const classic = createSessionBoard([]);
    for (let shot = 0; shot < 10; shot += 1) {
      themed.chain.packets.push(createPacket({ type: 'INFO', distance: 200 }));
      classic.chain.packets.push(createPacket({ type: 'INFO', distance: 200 }));
      const { type } = themed.fire();
      classic.fire();
      expect(themed.step(0, SELECTED_THEME.packetColor)[0]).toMatchObject({
        kind: 'shot',
        color: SELECTED_THEME.packetColor(type),
      });
      expect(classic.step(0, colorForType)[0]).toMatchObject({
        kind: 'shot',
        color: colorForType(type),
      });
      expect(themed.cursor.currentType).toBe(classic.cursor.currentType);
      expect(themed.nextType).toBe(classic.nextType);
    }
  });

  it('colors a real insertion impact from the selected palette', () => {
    const session = createSessionBoard([createPacket({ type: 'INFO', distance: 200 })]);
    session.cursor.currentType = 'FATAL';
    session.fire();
    expect(session.step(0, SELECTED_THEME.packetColor)[0]).toMatchObject({
      kind: 'shot',
      color: SELECTED_THEME.packetColor('FATAL'),
    });
    expect(session.chain.packets.some(({ type }) => type === 'FATAL')).toBe(true);
  });
});
