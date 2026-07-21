import { beforeEach, describe, expect, it } from 'vitest';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { presentTypes, removeAllOfType, rollbackChain } from '@/engine/systems/PowerUpSystem';
import { PACKET_SPACING } from '@/config/constants';
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
