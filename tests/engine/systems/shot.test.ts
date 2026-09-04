import { beforeEach, describe, expect, it } from 'vitest';
import { applyShot, spawnProjectiles } from '@/engine/systems/ShotSystem';
import { Path } from '@/engine/entities/Path';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { FORK_SPREAD } from '@/config/powerUps';
import type { DataPacket, PacketType, PowerUpType } from '@/types/game.types';

const straightPath = new Path([vec2(0, 0), vec2(600, 0)]);

beforeEach(() => {
  resetPacketIds();
});

function packet(
  type: PacketType,
  distance: number,
  powerUpType: PowerUpType | null = null,
): DataPacket {
  return createPacket({ type, distance, powerUpType });
}

describe('applyShot', () => {
  it('reports a miss and leaves the chain untouched when nothing is hit', () => {
    const packets = [packet('INFO', 100)];
    const outcome = applyShot(packets, straightPath, { position: vec2(500, 0), type: 'ERROR' });

    expect(outcome.hit).toBe(false);
    expect(outcome).toMatchObject({ score: 0, explosions: 0, combo: null, clearedChain: false });
    expect(packets).toHaveLength(1);
  });

  it('inserts the packet without matching when no run of three forms', () => {
    const packets = [packet('INFO', 100), packet('ERROR', 200)];
    const outcome = applyShot(packets, straightPath, { position: vec2(208, 0), type: 'ERROR' });

    expect(outcome).toMatchObject({ hit: true, explosions: 0, score: 0, clearedChain: false });
    expect(packets).toHaveLength(3);
  });

  it('clears a matched run, scores it and leaves the survivors', () => {
    const packets = [packet('SUCCESS', 100), packet('ERROR', 200), packet('ERROR', 216)];
    const outcome = applyShot(packets, straightPath, { position: vec2(208, 0), type: 'ERROR' });

    expect(outcome).toMatchObject({ hit: true, explosions: 1, score: 30, combo: null });
    expect(outcome.clearedChain).toBe(false);
    expect(packets.map((p) => p.type)).toEqual(['SUCCESS']);
  });

  it('flags a cleared chain when the last run is removed', () => {
    const packets = [packet('ERROR', 200), packet('ERROR', 216)];
    const outcome = applyShot(packets, straightPath, { position: vec2(208, 0), type: 'ERROR' });

    expect(outcome.clearedChain).toBe(true);
    expect(packets).toHaveLength(0);
  });

  it('labels a two-explosion cascade as a combo', () => {
    const packets = [
      packet('SUCCESS', 100),
      packet('SUCCESS', 132),
      packet('ERROR', 200),
      packet('ERROR', 232),
      packet('SUCCESS', 300),
    ];
    const outcome = applyShot(packets, straightPath, { position: vec2(240, 0), type: 'ERROR' });

    expect(outcome.explosions).toBe(2);
    expect(outcome.combo).toEqual({ multiplier: 2, text: 'SEGFAULT!' });
  });

  it('collects the power-ups carried by removed packets', () => {
    const packets = [packet('ERROR', 200), packet('ERROR', 216, 'SLEEP')];
    const outcome = applyShot(packets, straightPath, { position: vec2(208, 0), type: 'ERROR' });

    expect(outcome.powerUps).toEqual(['SLEEP']);
  });

  it('reports a burst per removed packet and the id of the inserted one', () => {
    const packets = [packet('ERROR', 200), packet('ERROR', 216)];
    const outcome = applyShot(packets, straightPath, { position: vec2(208, 0), type: 'ERROR' });

    // Two existing packets plus the inserted one all detonate.
    expect(outcome.bursts).toHaveLength(3);
    expect(outcome.bursts[0]!.color).toBe('#ff5555');
    expect(typeof outcome.insertedId).toBe('number');
  });
});

describe('spawnProjectiles', () => {
  const origin = vec2(480, 300);

  it('launches one projectile down the aimed angle', () => {
    const shots = spawnProjectiles(origin, 0.5, 'INFO', false);

    expect(shots).toHaveLength(1);
    expect(shots[0]!.type).toBe('INFO');
    expect(shots[0]!.position).toEqual(origin);
  });

  it('launches three spread around the angle when a fork is armed', () => {
    const shots = spawnProjectiles(origin, 0.5, 'INFO', true);

    expect(shots).toHaveLength(3);
    // Every projectile carries the same packet, only the direction differs.
    expect(shots.every((shot) => shot.type === 'INFO')).toBe(true);
    const headings = shots.map((shot) => Math.atan2(shot.velocity.y, shot.velocity.x));
    expect(headings[0]).toBeCloseTo(0.5 - FORK_SPREAD);
    expect(headings[1]).toBeCloseTo(0.5);
    expect(headings[2]).toBeCloseTo(0.5 + FORK_SPREAD);
  });
});
