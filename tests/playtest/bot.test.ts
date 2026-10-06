import { describe, expect, it } from 'vitest';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import type { PacketType } from '@/types/game.types';
import { chooseShot, type SkillLevel } from '../../playtest/bot';
import { straightSession } from '../helpers/levelSession';

const SPACING = 32;
const FIRST_DISTANCE = 100;
const BELOW_TRACK = vec2(300, 200);
const FIRST_SHOT = 0;

function board(
  types: readonly PacketType[],
  ready: PacketType,
  next: PacketType,
  firstDistance = FIRST_DISTANCE,
) {
  const packets = types.map((type, index) =>
    createPacket({ type, distance: firstDistance + index * SPACING }),
  );
  return straightSession(packets, { position: BELOW_TRACK, type: ready, nextType: next, speed: 0 });
}

describe('chooseShot', () => {
  it.each<SkillLevel>(['casual', 'skilled'])(
    '%s still shoots when no packet on the board shares a cursor colour',
    (skill) => {
      const session = board(['INFO', 'SUCCESS'], 'ERROR', 'WARNING');

      expect(chooseShot(session, skill, FIRST_SHOT)).not.toBeNull();
    },
  );

  it('skilled swaps to the next packet when only that one completes a triple', () => {
    const session = board(['SUCCESS', 'SUCCESS', 'INFO'], 'ERROR', 'SUCCESS');

    expect(chooseShot(session, 'skilled', FIRST_SHOT)?.shouldSwap).toBe(true);
  });

  it('casual plays the ready packet and never swaps', () => {
    const session = board(['SUCCESS', 'SUCCESS', 'INFO'], 'ERROR', 'SUCCESS');

    expect(chooseShot(session, 'casual', FIRST_SHOT)?.shouldSwap).toBe(false);
  });

  it('skilled stops holding fire once the chain front is well along the track', () => {
    // Still entering at the back, as a chain longer than its track always is,
    // but the front has covered more than a quarter of the 600-long track.
    const alternating: PacketType[] = Array.from({ length: 8 }, (_, index) =>
      index % 2 === 0 ? 'INFO' : 'SUCCESS',
    );
    const session = board(alternating, 'ERROR', 'WARNING', -SPACING);

    expect(session.chain.packets.some(({ distance }) => distance < 0)).toBe(true);
    expect(chooseShot(session, 'skilled', FIRST_SHOT)).not.toBeNull();
  });

  it('skilled holds fire on a lone placement while packets are still entering', () => {
    const session = board(['INFO', 'SUCCESS', 'INFO'], 'ERROR', 'WARNING', -SPACING);

    expect(chooseShot(session, 'skilled', FIRST_SHOT)).toBeNull();
  });
});
