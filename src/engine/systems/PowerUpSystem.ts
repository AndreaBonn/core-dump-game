import { compactBehind } from '@/engine/core/chainOps';
import type { DataPacket, PacketType } from '@/types/game.types';

/** Distinct packet types currently present in the chain. */
export function presentTypes(packets: readonly DataPacket[]): PacketType[] {
  const seen = new Set<PacketType>();
  for (const packet of packets) {
    seen.add(packet.type);
  }
  return [...seen];
}

/**
 * Remove every packet of `type` from the chain and re-space the survivors,
 * keeping the front anchored (the `garbage collect` power-up). Mutates the
 * chain in place and returns the removed packets.
 */
export function removeAllOfType(packets: DataPacket[], type: PacketType): DataPacket[] {
  const removed: DataPacket[] = [];
  const kept: DataPacket[] = [];
  for (const packet of packets) {
    (packet.type === type ? removed : kept).push(packet);
  }
  packets.length = 0;
  packets.push(...kept);
  if (packets.length > 0) {
    compactBehind(packets, packets.length - 1);
  }
  return removed;
}

/**
 * Move the whole chain backward along the path by `distance` (the `rollback()`
 * power-up). Mutates the chain in place.
 */
export function rollbackChain(packets: readonly DataPacket[], distance: number): void {
  for (const packet of packets) {
    packet.distance -= distance;
  }
}
