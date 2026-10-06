import { describe, expect, it } from 'vitest';
import { createPacket } from '@/engine/entities/DataPacket';
import {
  ROLLBACK_DISTANCE,
  SHIELD_ROLLBACK,
  SLEEP_DURATION,
  SLEEP_FACTOR,
} from '@/config/powerUps';
import { BASE_SPEED, packetColor, powerUpSession, straightSession } from '../helpers/levelSession';

describe('LevelSession power-up effects', () => {
  it('applies a power-up carried by a matched packet', () => {
    const session = straightSession([
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216, powerUpType: 'SLEEP' }),
    ]);
    session.fire();
    expect(session.step(0, packetColor).map((event) => event.kind)).toEqual([
      'shot',
      'powerUp',
      'cleared',
    ]);
    expect(session.chain.speed).toBeCloseTo(BASE_SPEED * SLEEP_FACTOR);
  });

  it('FORK arms the next shot to split', () => {
    const session = powerUpSession('FORK', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    expect(session.step(0, packetColor)).toContainEqual({ kind: 'powerUp', type: 'FORK' });
    session.fire();
    expect(session.projectiles).toHaveLength(3);
  });

  it('splits the next shot into three projectiles while a fork is pending', () => {
    const session = powerUpSession('FORK', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    session.step(0, packetColor);
    session.fire();
    expect(session.projectiles).toHaveLength(3);
    session.fire();
    expect(session.projectiles).toHaveLength(4);
  });

  it('SLEEP slows the chain, and step restores speed when the timer elapses', () => {
    const session = powerUpSession('SLEEP', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    session.step(0, packetColor);
    expect(session.chain.speed).toBeCloseTo(BASE_SPEED * SLEEP_FACTOR);
    session.step(SLEEP_DURATION + 1, packetColor);
    expect(session.chain.speed).toBe(BASE_SPEED);
  });

  it('keeps the chain slowed while SLEEP still has time left', () => {
    const session = powerUpSession('SLEEP', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    session.step(0, packetColor);
    session.step(SLEEP_DURATION / 2, packetColor);
    expect(session.chain.speed).toBeCloseTo(BASE_SPEED * SLEEP_FACTOR);
    session.step(SLEEP_DURATION / 2, packetColor);
    expect(session.chain.speed).toBe(BASE_SPEED);
  });

  it('GARBAGE_COLLECT removes every packet of one present type', () => {
    const session = powerUpSession('GARBAGE_COLLECT', [
      createPacket({ type: 'INFO', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 132 }),
      createPacket({ type: 'INFO', distance: 164 }),
    ]);
    session.fire();
    expect(session.step(0, packetColor)).toContainEqual({
      kind: 'powerUp',
      type: 'GARBAGE_COLLECT',
    });
    expect(session.chain.packets.length).toBeLessThan(3);
    expect(new Set(session.chain.packets.map((packet) => packet.type)).size).toBe(1);
  });

  it('GARBAGE_COLLECT is a no-op on an empty chain', () => {
    const session = powerUpSession('GARBAGE_COLLECT', []);
    session.fire();
    expect(session.step(0, packetColor)).toContainEqual({
      kind: 'powerUp',
      type: 'GARBAGE_COLLECT',
    });
    expect(session.chain.packets).toHaveLength(0);
  });

  it('ROLLBACK retreats every packet by the rollback distance', () => {
    const session = powerUpSession('ROLLBACK', [
      createPacket({ type: 'INFO', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 132 }),
    ]);
    session.fire();
    session.step(0, packetColor);
    expect(session.chain.packets.map((packet) => packet.distance)).toEqual([
      100 - ROLLBACK_DISTANCE,
      132 - ROLLBACK_DISTANCE,
    ]);
  });

  it('shoves the chain back instead of ending the run when a try/catch shield is up', () => {
    const session = powerUpSession('TRY_CATCH', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    session.step(0, packetColor);
    const events = session.step(
      (session.path.length - session.chain.frontDistance) / BASE_SPEED,
      packetColor,
    );
    expect(events).toEqual([{ kind: 'shieldCaught' }]);
    expect(session.chain.packets[0]!.distance).toBeCloseTo(session.path.length - SHIELD_ROLLBACK);
  });

  it('ends the run on the second reach of the void, the shield being spent', () => {
    const session = powerUpSession('TRY_CATCH', [createPacket({ type: 'INFO', distance: 100 })]);
    session.fire();
    session.step(0, packetColor);
    expect(
      session.step((session.path.length - session.chain.frontDistance) / BASE_SPEED, packetColor),
    ).toEqual([{ kind: 'shieldCaught' }]);
    expect(session.step(SHIELD_ROLLBACK / BASE_SPEED, packetColor)).toEqual([{ kind: 'breached' }]);
  });
});
