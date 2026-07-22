import { beforeEach, describe, expect, it } from 'vitest';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { findRun, resolveMatches, scoreForMatch } from '@/engine/systems/MatchSystem';
import { PACKET_SPACING } from '@/config/constants';
import type { DataPacket, PacketType } from '@/types/game.types';

beforeEach(() => {
  resetPacketIds();
});

function chain(types: PacketType[]): DataPacket[] {
  return types.map((type, index) => createPacket({ type, distance: index * PACKET_SPACING }));
}

describe('scoreForMatch', () => {
  it('scores nothing below the minimum run', () => {
    expect(scoreForMatch(2)).toBe(0);
  });

  it('scores 30 for a run of three and 15 per extra packet', () => {
    expect(scoreForMatch(3)).toBe(30);
    expect(scoreForMatch(4)).toBe(45);
    expect(scoreForMatch(6)).toBe(75);
  });
});

describe('findRun', () => {
  it('finds the contiguous run of same-type packets around an index', () => {
    const packets = chain(['SUCCESS', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    expect(findRun(packets, 2)).toEqual({ start: 1, length: 3 });
  });

  it('reports a length-1 run when neighbours differ', () => {
    const packets = chain(['SUCCESS', 'ERROR', 'SUCCESS']);
    expect(findRun(packets, 1)).toEqual({ start: 1, length: 1 });
  });

  it('reports an empty run for an out-of-range index', () => {
    const packets = chain(['SUCCESS', 'ERROR']);
    expect(findRun(packets, 99)).toEqual({ start: 99, length: 0 });
  });
});

describe('resolveMatches', () => {
  it('returns null when the insertion makes no run of three', () => {
    const packets = chain(['SUCCESS', 'ERROR', 'SUCCESS']);
    expect(resolveMatches(packets, 1)).toBeNull();
    expect(packets).toHaveLength(3);
  });

  it('removes a plain match of three and scores 30', () => {
    const packets = chain(['SUCCESS', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    const result = resolveMatches(packets, 2);
    expect(result).not.toBeNull();
    expect(result!.explosions).toBe(1);
    expect(result!.score).toBe(30);
    expect(result!.removed).toHaveLength(3);
    expect(packets.map((p) => p.type)).toEqual(['SUCCESS', 'SUCCESS']);
  });

  it('chains a combo when compaction lines up another match', () => {
    const packets = chain(['SUCCESS', 'SUCCESS', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    const result = resolveMatches(packets, 3);
    expect(result!.explosions).toBe(2);
    expect(result!.score).toBe(30 * 1 + 30 * 2);
    expect(result!.removed).toHaveLength(6);
    expect(packets).toHaveLength(0);
  });

  it('keeps trailing packets spaced by PACKET_SPACING after compaction', () => {
    const packets = chain(['INFO', 'SUCCESS', 'ERROR', 'ERROR', 'ERROR']);
    resolveMatches(packets, 3);
    expect(packets.map((p) => p.type)).toEqual(['INFO', 'SUCCESS']);
    expect(packets[1]!.distance - packets[0]!.distance).toBeCloseTo(PACKET_SPACING);
  });
});
