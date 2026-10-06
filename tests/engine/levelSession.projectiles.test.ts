import { describe, expect, it } from 'vitest';
import { PROJECTILE_SPEED } from '@/config/constants';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { packetColor, straightSession } from '../helpers/levelSession';

describe('LevelSession projectile lifetime', () => {
  it('leaves no projectile behind when a shot completes the level mid-frame', () => {
    const session = straightSession([
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    session.fire();
    session.fire();
    expect(session.projectiles).toHaveLength(2);
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual(['shot', 'cleared']);
    expect(session.projectiles).toHaveLength(0);
    expect(session.step(1, packetColor)).toEqual([]);
  });

  it('drops projectiles that leave the board and keeps those still inside', () => {
    const session = straightSession([], { position: vec2(100, 300), speed: 0 });
    session.aim(vec2(5000, 300));
    session.fire();
    session.step(600 / PROJECTILE_SPEED, packetColor);
    session.fire();
    const inside = session.projectiles[1];
    expect(session.projectiles).toHaveLength(2);
    session.step(400 / PROJECTILE_SPEED, packetColor);
    expect(session.projectiles).toEqual([inside]);
  });

  it('consumes a shot that lodges in the chain while the other shots keep flying', () => {
    const session = straightSession(
      [
        createPacket({ type: 'SUCCESS', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ],
      { position: vec2(200, 0), speed: 0, nextType: 'ERROR' },
    );
    session.aim(vec2(200, 300));
    session.fire();
    session.step(300 / PROJECTILE_SPEED, packetColor);
    const stillFlying = session.projectiles[0];
    session.fire();
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual(['shot']);
    expect(session.chain.packets.map((packet) => packet.type)).toEqual(['SUCCESS']);
    expect(session.projectiles).toEqual([stillFlying]);
  });

  it('ends the game when the chain front reaches the void', () => {
    const session = straightSession([createPacket({ type: 'INFO', distance: 600 })], {
      speed: 0,
    });
    session.fire();
    expect(session.projectiles).toHaveLength(1);
    expect(session.step(0, packetColor)).toEqual([{ kind: 'breached' }]);
    expect(session.projectiles).toHaveLength(0);
    expect(session.step(1, packetColor)).toEqual([]);
  });
});
