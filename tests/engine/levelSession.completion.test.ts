import { describe, expect, it } from 'vitest';
import { createPacket } from '@/engine/entities/DataPacket';
import { packetColor, straightSession } from '../helpers/levelSession';

describe('LevelSession completion', () => {
  it('detonates the hazards and completes the level when only hazards are left', () => {
    const session = straightSession([
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216 }),
      createPacket({ type: 'INFO', distance: 300, matchable: false }),
    ]);
    session.fire();
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual([
      'shot',
      'hazardCleared',
      'cleared',
    ]);
    expect(session.chain.isEmpty).toBe(true);
  });

  it('keeps playing when a hazard is left next to a matchable packet', () => {
    const session = straightSession([
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216 }),
      createPacket({ type: 'INFO', distance: 300, matchable: false }),
      createPacket({ type: 'SUCCESS', distance: 316 }),
    ]);
    session.fire();
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual(['shot']);
    expect(session.chain.packets.map((packet) => packet.matchable)).toEqual([false, true]);
  });

  it('completes the level when a released power-up empties the chain', () => {
    const session = straightSession([
      createPacket({ type: 'ERROR', distance: 200, powerUpType: 'KILL_9' }),
      createPacket({ type: 'ERROR', distance: 216 }),
      createPacket({ type: 'INFO', distance: 300 }),
      createPacket({ type: 'SUCCESS', distance: 316 }),
    ]);
    session.fire();
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual([
      'shot',
      'powerUp',
      'cleared',
    ]);
    expect(session.chain.isEmpty).toBe(true);
  });
});
