import type { Rng } from '@/engine/math/rng';
import type { DataPacket } from '@/types/game.types';

// A different mixing constant from dailySeed keeps armor on a dedicated seed stream.
const ARMOR_SEED_MULTIPLIER = 0x27d4eb2d;

/**
 * Seed of the armor stream for a level. Armor draws from its own rng so that
 * enabling it never shifts the main stream that lays out the chain and feeds
 * the cursor.
 */
export function armorSeed(seed: number): number {
  let hash = seed >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), ARMOR_SEED_MULTIPLIER);
  hash = Math.imul(hash ^ (hash >>> 16), ARMOR_SEED_MULTIPLIER);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * Armor a share of the chain: each matchable packet without a power-up gets
 * one layer with probability `armorChance`. Hazards cannot be matched, so armor
 * on them would mean nothing, and a power-up stays one shot away. Pure: returns
 * new packets, leaves the input alone.
 */
export function applyArmor(packets: DataPacket[], armorChance: number, rng: Rng): DataPacket[] {
  return packets.map((packet) =>
    packet.matchable && packet.powerUpType === null && rng.next() < armorChance
      ? { ...packet, armor: 1 }
      : packet,
  );
}
