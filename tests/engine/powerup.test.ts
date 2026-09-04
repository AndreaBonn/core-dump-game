import { beforeEach, describe, expect, it } from 'vitest';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import {
  presentTypes,
  removeAllOfType,
  resolvePowerUp,
  rollbackChain,
} from '@/engine/systems/PowerUpSystem';
import { PACKET_SPACING } from '@/config/constants';
import { ROLLBACK_DISTANCE, SLEEP_DURATION, SLEEP_FACTOR } from '@/config/powerUps';
import { createRng } from '@/engine/math/rng';
import type { DataPacket, PacketType } from '@/types/game.types';

beforeEach(() => {
  resetPacketIds();
});

function chain(types: PacketType[]): DataPacket[] {
  return types.map((type, index) => createPacket({ type, distance: index * PACKET_SPACING }));
}

describe('presentTypes', () => {
  it('returns the distinct packet types in the chain', () => {
    const packets = chain(['INFO', 'ERROR', 'INFO', 'SUCCESS']);
    expect(new Set(presentTypes(packets))).toEqual(new Set(['INFO', 'ERROR', 'SUCCESS']));
  });
});

describe('removeAllOfType (garbage collect)', () => {
  it('removes every packet of the given type and re-spaces the rest', () => {
    const packets = chain(['INFO', 'ERROR', 'INFO', 'SUCCESS', 'INFO']);
    const removed = removeAllOfType(packets, 'INFO');
    expect(removed).toHaveLength(3);
    expect(packets.map((p) => p.type)).toEqual(['ERROR', 'SUCCESS']);
    expect(packets[1]!.distance - packets[0]!.distance).toBeCloseTo(PACKET_SPACING);
  });

  it('leaves the chain untouched when no packet matches', () => {
    const packets = chain(['ERROR', 'SUCCESS']);
    expect(removeAllOfType(packets, 'INFO')).toHaveLength(0);
    expect(packets).toHaveLength(2);
  });
});

describe('rollbackChain', () => {
  it('moves every packet backward by the given distance', () => {
    const packets = chain(['INFO', 'ERROR']);
    rollbackChain(packets, 100);
    expect(packets[0]!.distance).toBe(-100);
    expect(packets[1]!.distance).toBe(PACKET_SPACING - 100);
  });
});

describe('resolvePowerUp', () => {
  function context(packets: DataPacket[]) {
    return { packets, rng: createRng(1) };
  }

  it('SLEEP slows the chain for the sleep duration and arms no fork', () => {
    const effect = resolvePowerUp('SLEEP', context([]));
    expect(effect).toEqual({
      speedFactor: SLEEP_FACTOR,
      sleepSeconds: SLEEP_DURATION,
      armsFork: false,
    });
  });

  it('FORK arms the next shot and leaves the chain speed alone', () => {
    const effect = resolvePowerUp('FORK', context([]));
    expect(effect).toEqual({ speedFactor: null, sleepSeconds: null, armsFork: true });
  });

  it('GARBAGE_COLLECT removes every packet of one type present in the chain', () => {
    const packets = chain(['INFO', 'ERROR', 'INFO']);
    const effect = resolvePowerUp('GARBAGE_COLLECT', context(packets));

    expect(effect).toEqual({ speedFactor: null, sleepSeconds: null, armsFork: false });
    const remaining = new Set(packets.map((packet) => packet.type));
    expect(remaining.size).toBe(1);
    expect(packets.length).toBeLessThan(3);
  });

  it('GARBAGE_COLLECT leaves an empty chain untouched instead of throwing', () => {
    const packets: DataPacket[] = [];
    expect(() => resolvePowerUp('GARBAGE_COLLECT', context(packets))).not.toThrow();
    expect(packets).toHaveLength(0);
  });

  it('ROLLBACK retreats every packet by the rollback distance', () => {
    const packets = chain(['INFO', 'ERROR']);
    resolvePowerUp('ROLLBACK', context(packets));
    expect(packets.map((packet) => packet.distance)).toEqual([
      -ROLLBACK_DISTANCE,
      PACKET_SPACING - ROLLBACK_DISTANCE,
    ]);
  });
});
