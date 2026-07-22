import { BOARD_HEIGHT, BOARD_WIDTH, PACKET_RADIUS } from '@/config/constants';
import { findCollisionIndex, type PathQuery } from '@/engine/systems/CollisionSystem';
import type { Vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

/** Where a shot fired now would end up. */
export interface Landing {
  point: Vec2;
  /** True if it lands on the chain, false if it flies off the board. */
  hit: boolean;
}

const STEP = 8;
const MARGIN = PACKET_RADIUS * 2;

/**
 * Predict where a projectile fired from `origin` along `angle` would land, by
 * marching along the aim ray and testing the same collision the simulation
 * uses (`findCollisionIndex`). Reusing that test keeps the preview honest: the
 * dotted line ends exactly where a real shot would lodge. Pure and deterministic.
 */
export function predictLanding(
  origin: Vec2,
  angle: number,
  packets: readonly DataPacket[],
  path: PathQuery,
): Landing {
  const dx = Math.cos(angle) * STEP;
  const dy = Math.sin(angle) * STEP;
  // Start one step out so the cursor's own centre never counts as a hit; each
  // step advances by a fixed length, so the ray always leaves the board.
  let x = origin.x + dx;
  let y = origin.y + dy;

  while (x >= -MARGIN && x <= BOARD_WIDTH + MARGIN && y >= -MARGIN && y <= BOARD_HEIGHT + MARGIN) {
    if (findCollisionIndex(packets, path, { x, y }) >= 0) {
      return { point: { x, y }, hit: true };
    }
    x += dx;
    y += dy;
  }
  return { point: { x, y }, hit: false };
}
