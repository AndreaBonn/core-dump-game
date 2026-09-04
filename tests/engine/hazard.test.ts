import { beforeEach, describe, expect, it } from 'vitest';
import { findRun, resolveMatches } from '@/engine/systems/MatchSystem';
import { generateChainPackets } from '@/engine/core/chainOps';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { createRng } from '@/engine/math/rng';
import { PACKET_SPACING } from '@/config/constants';
import { buildLevelConfig, CAMPAIGN_SEED_BASE } from '@/config/levels';
import type { DataPacket, PacketType } from '@/types/game.types';

beforeEach(() => {
  resetPacketIds();
});

/** A chain where `!` marks a hazard of the preceding type. */
function chain(spec: readonly (readonly [PacketType, boolean])[]): DataPacket[] {
  return spec.map(([type, matchable], index) =>
    createPacket({ type, distance: index * PACKET_SPACING, matchable }),
  );
}

describe('a hazard in the chain', () => {
  it('never forms a run of its own, however many sit together', () => {
    const packets = chain([
      ['ERROR', false],
      ['ERROR', false],
      ['ERROR', false],
    ]);

    expect(findRun(packets, 1).length).toBe(0);
    expect(resolveMatches(packets, 1)).toBeNull();
    expect(packets).toHaveLength(3);
  });

  it('breaks a run that would otherwise match through it', () => {
    const packets = chain([
      ['ERROR', true],
      ['ERROR', false],
      ['ERROR', true],
      ['ERROR', true],
    ]);

    // The two on the right are a run of two, not a run of four through the
    // hazard, so nothing explodes.
    expect(findRun(packets, 2).length).toBe(2);
    expect(resolveMatches(packets, 2)).toBeNull();
  });

  it('is never removed by a match happening next to it', () => {
    const packets = chain([
      ['INFO', false],
      ['ERROR', true],
      ['ERROR', true],
      ['ERROR', true],
    ]);

    const resolution = resolveMatches(packets, 2);

    expect(resolution?.explosions).toBe(1);
    expect(packets).toHaveLength(1);
    expect(packets[0]!.matchable).toBe(false);
  });

  it('still lets the segments on either side match on their own', () => {
    const packets = chain([
      ['SUCCESS', true],
      ['SUCCESS', true],
      ['SUCCESS', true],
      ['DEBUG', false],
      ['INFO', true],
    ]);

    expect(resolveMatches(packets, 1)?.explosions).toBe(1);
    expect(packets.map((packet) => packet.type)).toEqual(['DEBUG', 'INFO']);
  });
});

describe('hazard generation', () => {
  const options = { count: 40, types: ['ERROR', 'SUCCESS'] as PacketType[] };

  it('produces none when the level asks for none', () => {
    const packets = generateChainPackets({ ...options, rng: createRng(1), hazardChance: 0 });

    expect(packets.every((packet) => packet.matchable)).toBe(true);
  });

  it('produces only hazards when the level asks for certainty', () => {
    const packets = generateChainPackets({ ...options, rng: createRng(1), hazardChance: 1 });

    expect(packets.every((packet) => !packet.matchable)).toBe(true);
  });

  it('never puts a power-up on a hazard, which could not be collected', () => {
    const packets = generateChainPackets({
      ...options,
      rng: createRng(7),
      hazardChance: 1,
      powerUpChance: 1,
    });

    expect(packets.every((packet) => !packet.isPowerUp)).toBe(true);
  });

  it('stays reproducible for a seed', () => {
    const first = generateChainPackets({ ...options, rng: createRng(42), hazardChance: 0.3 });
    const second = generateChainPackets({ ...options, rng: createRng(42), hazardChance: 0.3 });

    expect(first.map((packet) => packet.matchable)).toEqual(
      second.map((packet) => packet.matchable),
    );
  });
});

describe('hazard density per level', () => {
  it('leaves the first levels clean while the player learns the game', () => {
    for (let level = 1; level <= 3; level += 1) {
      expect(buildLevelConfig(level, CAMPAIGN_SEED_BASE).hazardChance).toBe(0);
    }
  });

  it('introduces hazards gradually and never floods a level', () => {
    const chances = Array.from(
      { length: 60 },
      (_, index) => buildLevelConfig(index + 1, CAMPAIGN_SEED_BASE).hazardChance,
    );

    expect(chances[9]).toBeGreaterThan(0);
    for (const chance of chances) {
      // Above roughly a fifth, a segment of the chain can be walled off with
      // no way to clear it: the cap is what keeps every level winnable.
      expect(chance).toBeLessThanOrEqual(0.2);
    }
    // Monotone: a later level is never easier on this axis than an earlier one.
    for (let i = 1; i < chances.length; i += 1) {
      expect(chances[i]!).toBeGreaterThanOrEqual(chances[i - 1]!);
    }
  });
});
