import { createPacket } from '@/engine/entities/DataPacket';
import type { Rng } from '@/engine/math/rng';
import { PACKET_SPACING } from '@/config/constants';
import { POWER_UP_TYPES } from '@/config/powerUps';
import type { DataPacket, PacketType } from '@/types/game.types';

export interface ChainGenerationOptions {
  count: number;
  types: readonly PacketType[];
  rng: Rng;
  /** Probability in [0, 1] that a generated packet carries a power-up. */
  powerUpChance?: number;
  /** Probability in [0, 1] that a generated packet is an unmatchable hazard. */
  hazardChance?: number;
}

/**
 * Build the initial chain packets, streaming in from behind the path start.
 * The front packet sits just behind distance 0; earlier packets trail off the
 * track at negative distances and scroll on as the chain advances. Each packet
 * has a `powerUpChance` probability of also carrying a power-up.
 */
export function generateChainPackets({
  count,
  types,
  rng,
  powerUpChance = 0,
  hazardChance = 0,
}: ChainGenerationOptions): DataPacket[] {
  const packets: DataPacket[] = [];
  for (let i = 0; i < count; i += 1) {
    const distanceFromFront = count - i;
    // Draw order is fixed so a seed keeps producing the same chain: hazard
    // first, then power-up, then type. A hazard carries no power-up, or
    // clearing it would be a reward instead of an obstacle.
    const isHazard = rng.next() < hazardChance;
    const powerUpType = !isHazard && rng.next() < powerUpChance ? rng.pick(POWER_UP_TYPES) : null;
    packets.push(
      createPacket({
        type: rng.pick(types),
        distance: -distanceFromFront * PACKET_SPACING,
        powerUpType,
        matchable: !isHazard,
      }),
    );
  }
  return packets;
}

/**
 * Re-space every packet behind `fromIndex` so the chain is contiguous up to
 * that packet, pulling trailing packets forward to remove any gap. Mutates the
 * packets in place; returns the same array for chaining.
 */
export function compactBehind(packets: DataPacket[], fromIndex: number): DataPacket[] {
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    const ahead = packets[i + 1]!;
    packets[i]!.distance = ahead.distance - PACKET_SPACING;
  }
  return packets;
}

/**
 * Splice `packet` into the chain at array `position`, then re-space so it sits
 * one spacing behind its front neighbour, pushing the trailing packets back to
 * make room. The chain front (higher indices) stays anchored. Mutates in place.
 */
export function insertPacketAt(packets: DataPacket[], position: number, packet: DataPacket): void {
  packets.splice(position, 0, packet);
  const frontIndex = position + 1;
  if (frontIndex < packets.length) {
    compactBehind(packets, frontIndex);
  } else {
    const behind = packets[position - 1];
    packet.distance = behind ? behind.distance + PACKET_SPACING : 0;
  }
}
