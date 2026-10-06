import { describe, expect, it } from 'vitest';
import { CRACK_SCORE } from '@/config/constants';
import { createPacket } from '@/engine/entities/DataPacket';
import { createSessionBoard, fireSessionShot } from '../helpers/sessionBoard';

describe('LevelSession with armored packets', () => {
  it('credits the crack score when a shot only cracks an armored run', () => {
    const session = createSessionBoard([
      createPacket({ type: 'ERROR', distance: 200, armor: 1 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    const events = fireSessionShot(session);
    expect(events[0]).toMatchObject({
      kind: 'shot',
      outcome: { score: CRACK_SCORE, cracked: 3, explosions: 0, combo: null },
    });
    expect(session.chain.packets).toHaveLength(3);
  });

  it('explodes the cracked run on the next matching shot', () => {
    const session = createSessionBoard([
      createPacket({ type: 'SUCCESS', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200, armor: 1 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    fireSessionShot(session);
    const events = fireSessionShot(session);
    expect(session.chain.packets.map((packet) => packet.type)).toEqual(['SUCCESS']);
    expect(events.find((event) => event.kind === 'shot')!.outcome.score).toBeGreaterThan(
      CRACK_SCORE,
    );
  });
});
