import { beforeEach, describe, expect, it } from 'vitest';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';

beforeEach(() => {
  resetPacketIds();
});

describe('createPacket armor', () => {
  it('defaults to no armor', () => {
    const packet = createPacket({ type: 'ERROR', distance: 32 });

    expect(packet.armor).toBe(0);
    expect(packet).toMatchObject({ type: 'ERROR', distance: 32, matchable: true });
  });

  it('preserves explicit armor on a matchable packet', () => {
    const packet = createPacket({ type: 'INFO', distance: 64, armor: 2 });

    expect(packet.armor).toBe(2);
    expect(packet.matchable).toBe(true);
  });

  it('drops requested armor and power-ups from a hazard', () => {
    const packet = createPacket({
      type: 'WARNING',
      distance: 96,
      matchable: false,
      armor: 1,
      powerUpType: 'SLEEP',
    });

    expect(packet).toMatchObject({
      armor: 0,
      matchable: false,
      powerUpType: null,
      isPowerUp: false,
    });
  });

  it('keeps sequential ids across armored and unarmored packets', () => {
    const first = createPacket({ type: 'ERROR', distance: 0, armor: 1 });
    const second = createPacket({ type: 'SUCCESS', distance: 32 });
    const third = createPacket({ type: 'INFO', distance: 64, matchable: false, armor: 1 });

    expect([first.id, second.id, third.id]).toEqual([1, 2, 3]);
  });
});
