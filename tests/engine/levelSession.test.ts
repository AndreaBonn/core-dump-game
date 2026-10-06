import { describe, expect, it } from 'vitest';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { packetColor, straightSession } from '../helpers/levelSession';

describe('LevelSession aiming and matching', () => {
  it('aims the cursor toward a point', () => {
    const session = straightSession([]);
    session.aim(vec2(600, 0));
    expect(session.cursor.angle).toBeCloseTo(0, 1);
    session.aim(vec2(208, 600));
    expect(session.cursor.angle).toBeCloseTo(Math.PI / 2);
  });

  it('swaps the ready and preview packets', () => {
    const session = straightSession([]);
    const ready = session.cursor.currentType;
    const next = session.nextType;
    session.swap();
    expect(session.cursor.currentType).toBe(next);
    expect(session.nextType).toBe(ready);
  });

  it('clears a matched run and reports its score', () => {
    const session = straightSession([
      createPacket({ type: 'SUCCESS', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    const fired = session.fire();
    expect(fired).toEqual({ type: 'ERROR', position: vec2(208, 0) });
    expect(session.step(0, packetColor)).toEqual([
      expect.objectContaining({
        kind: 'shot',
        outcome: expect.objectContaining({ hit: true, score: 30, combo: null }),
      }),
    ]);
    expect(session.chain.packets.map((packet) => packet.type)).toEqual(['SUCCESS']);
  });

  it('emits a combo label when compaction chains a second explosion', () => {
    const session = straightSession(
      [
        createPacket({ type: 'SUCCESS', distance: 100 }),
        createPacket({ type: 'SUCCESS', distance: 132 }),
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 232 }),
        createPacket({ type: 'SUCCESS', distance: 300 }),
      ],
      { position: vec2(240, 0) },
    );
    session.fire();
    expect(session.step(0, packetColor)).toContainEqual(
      expect.objectContaining({
        kind: 'shot',
        outcome: expect.objectContaining({ combo: { multiplier: 2, id: 'segfault' } }),
      }),
    );
  });

  it('returns no shot and leaves the chain untouched when nothing is hit', () => {
    const session = straightSession([createPacket({ type: 'INFO', distance: 100 })], {
      position: vec2(500, 0),
      speed: 0,
    });
    session.fire();
    expect(session.step(0, packetColor)).toEqual([]);
    expect(session.chain.packets).toHaveLength(1);
    const hit = straightSession([createPacket({ type: 'INFO', distance: 500 })], {
      position: vec2(500, 0),
      speed: 0,
    });
    hit.fire();
    expect(hit.step(0, packetColor)).toContainEqual(expect.objectContaining({ kind: 'shot' }));
    expect(hit.chain.packets).toHaveLength(2);
  });

  it('lodges a non-matching packet without scoring', () => {
    const session = straightSession([
      createPacket({ type: 'INFO', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200 }),
    ]);
    session.fire();
    expect(session.step(0, packetColor)).toContainEqual(
      expect.objectContaining({
        kind: 'shot',
        outcome: expect.objectContaining({ hit: true, score: 0 }),
      }),
    );
    expect(session.chain.packets).toHaveLength(3);
  });
});
