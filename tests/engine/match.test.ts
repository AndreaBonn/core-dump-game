import { beforeEach, describe, expect, it } from 'vitest';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import {
  findRun,
  removeStrandedHazards,
  resolveMatches,
  scoreForMatch,
} from '@/engine/systems/MatchSystem';
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
    expect(result!.cracked).toBe(0);
    expect(result!.removed).toHaveLength(3);
    expect(packets.map((p) => p.type)).toEqual(['SUCCESS', 'SUCCESS']);
  });

  it('chains a combo when compaction lines up another match', () => {
    const packets = chain(['SUCCESS', 'SUCCESS', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    const result = resolveMatches(packets, 3);
    expect(result!.explosions).toBe(2);
    expect(result!.score).toBe(30 * 1 + 30 * 2);
    expect(result!.cracked).toBe(0);
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

describe('armored matches', () => {
  it('cracks the entire run of three without removing packets', () => {
    const packets = chain(['ERROR', 'ERROR', 'ERROR']);
    packets[1]!.armor = 1;
    const ids = packets.map((p) => p.id);

    const result = resolveMatches(packets, 1);

    expect(packets).toHaveLength(3);
    expect(packets.map((p) => p.id)).toEqual(ids);
    expect(packets.map((p) => p.type)).toEqual(['ERROR', 'ERROR', 'ERROR']);
    expect(packets.map((p) => p.armor)).toEqual([0, 0, 0]);
    expect(result).toEqual({ removed: [], explosions: 0, cracked: 3, score: 10 });
  });

  it('explodes the cracked run when a later insertion makes four', () => {
    const packets = chain(['ERROR', 'ERROR', 'ERROR']);
    packets[1]!.armor = 1;
    const first = resolveMatches(packets, 1);
    expect(first).toMatchObject({ cracked: 3, explosions: 0, score: 10 });
    packets.push(createPacket({ type: 'ERROR', distance: 3 * PACKET_SPACING }));

    const result = resolveMatches(packets, 3);

    expect(result).toMatchObject({ explosions: 1, cracked: 0, score: scoreForMatch(4) });
    expect(result!.removed.map((p) => p.type)).toEqual(['ERROR', 'ERROR', 'ERROR', 'ERROR']);
    expect(packets).toEqual([]);
  });

  it('stops a cascade when compaction lines up an armored run', () => {
    const packets = chain(['SUCCESS', 'SUCCESS', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    packets[0]!.armor = 1;

    const result = resolveMatches(packets, 3);

    expect(result).toMatchObject({ explosions: 1, cracked: 3, score: 30 + 10 });
    expect(result!.removed.map((p) => p.type)).toEqual(['ERROR', 'ERROR', 'ERROR']);
    expect(packets.map((p) => p.type)).toEqual(['SUCCESS', 'SUCCESS', 'SUCCESS']);
    expect(packets.map((p) => p.armor)).toEqual([0, 0, 0]);
    expect(packets.map((p) => p.distance)).toEqual([3, 4, 5].map((i) => i * PACKET_SPACING));
  });

  it('awards a flat crack score for five packets and decrements armor by one', () => {
    const packets = chain(['ERROR', 'ERROR', 'ERROR', 'ERROR', 'ERROR']);
    packets[1]!.armor = 1;
    packets[2]!.armor = 2;
    packets[4]!.armor = 1;
    expect(findRun(packets, 2)).toEqual({ start: 0, length: 5 });

    const result = resolveMatches(packets, 2);

    expect(result).toEqual({ removed: [], explosions: 0, cracked: 5, score: 10 });
    expect(packets.map((p) => p.type)).toEqual(['ERROR', 'ERROR', 'ERROR', 'ERROR', 'ERROR']);
    expect(packets.map((p) => p.armor)).toEqual([0, 0, 1, 0, 0]);
  });

  it('leaves an armored run below MIN_MATCH unchanged', () => {
    const packets = chain(['ERROR', 'ERROR']);
    packets[0]!.armor = 1;
    const original = packets.map((p) => ({ ...p }));

    expect(resolveMatches(packets, 1)).toBeNull();
    expect(packets).toEqual(original);
  });

  it('does not multiply the crack score after two explosions', () => {
    const packets = chain([
      'INFO',
      'INFO',
      'SUCCESS',
      'SUCCESS',
      'ERROR',
      'ERROR',
      'ERROR',
      'SUCCESS',
      'INFO',
    ]);
    packets[0]!.armor = 1;

    const result = resolveMatches(packets, 5);

    expect(result).toMatchObject({ explosions: 2, cracked: 3, score: 30 + 30 * 2 + 10 });
    expect(result!.removed).toHaveLength(6);
    expect(packets.map((p) => p.type)).toEqual(['INFO', 'INFO', 'INFO']);
    expect(packets.map((p) => p.armor)).toEqual([0, 0, 0]);
  });

  it('does not compact or alter packets outside the cracked run', () => {
    const packets = chain(['INFO', 'ERROR', 'ERROR', 'ERROR', 'SUCCESS']);
    packets[0]!.distance = -2 * PACKET_SPACING;
    packets[0]!.armor = 2;
    packets[2]!.armor = 1;
    packets[4]!.armor = 1;
    const original = packets.map((p) => ({ ...p }));

    const result = resolveMatches(packets, 2);

    expect(result).toEqual({ removed: [], explosions: 0, cracked: 3, score: 10 });
    expect(packets).toEqual(original.map((p, i) => (i === 2 ? { ...p, armor: 0 } : p)));
  });

  it('keeps hazards while armored matchable packets remain', () => {
    const packets = chain(['ERROR', 'INFO']);
    packets.forEach((p) => {
      p.armor = 1;
    });
    const hazard = createPacket({
      type: 'WARNING',
      distance: 2 * PACKET_SPACING,
      matchable: false,
    });
    packets.push(hazard);
    const original = packets.map((p) => ({ ...p }));

    expect(removeStrandedHazards(packets)).toEqual([]);
    expect(packets).toEqual(original);
    const stranded = [hazard];
    expect(removeStrandedHazards(stranded)).toEqual([hazard]);
    expect(stranded).toEqual([]);
  });
});
