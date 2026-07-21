import { PACKET_RADIUS } from '@/config/constants';
import { subtract, type Vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

/** The path queries the collision system needs; satisfied by the Path entity. */
export interface PathQuery {
  pointAt(distance: number): Vec2;
  tangentAt(distance: number): Vec2;
}

const HIT_RADIUS = PACKET_RADIUS * 1.6;

/**
 * Index of the on-track chain packet closest to `point` within hit range, or
 * -1 if the point does not overlap the chain. Packets still streaming in
 * (negative distance) cannot be hit.
 */
export function findCollisionIndex(
  packets: readonly DataPacket[],
  path: PathQuery,
  point: Vec2,
): number {
  let bestIndex = -1;
  let bestDistance = HIT_RADIUS;
  for (let i = 0; i < packets.length; i += 1) {
    const packet = packets[i]!;
    if (packet.distance < 0) {
      continue;
    }
    const position = path.pointAt(packet.distance);
    const gap = Math.hypot(position.x - point.x, position.y - point.y);
    if (gap <= bestDistance) {
      bestDistance = gap;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Array position at which to splice a new packet, given the packet it hit.
 * If the impact point is ahead of the hit packet along the direction of travel
 * the new packet goes in front of it; otherwise behind.
 */
export function resolveInsertPosition(
  packets: readonly DataPacket[],
  path: PathQuery,
  collidedIndex: number,
  point: Vec2,
): number {
  const packet = packets[collidedIndex]!;
  const position = path.pointAt(packet.distance);
  const tangent = path.tangentAt(packet.distance);
  const toPoint = subtract(point, position);
  const projection = toPoint.x * tangent.x + toPoint.y * tangent.y;
  return projection >= 0 ? collidedIndex + 1 : collidedIndex;
}
