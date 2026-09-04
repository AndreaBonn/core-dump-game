import { BOARD_HEIGHT, BOARD_WIDTH } from '@/config/constants';
import type { Vec2 } from '@/engine/math/vec2';

/**
 * Whether a point is still on the board, allowing `margin` pixels of overshoot
 * on every side. Projectiles are dropped once they leave this area, so the
 * margin decides how far past the edge a miss is still simulated.
 */
export function isInsideBoard(point: Vec2, margin: number): boolean {
  return (
    point.x >= -margin &&
    point.x <= BOARD_WIDTH + margin &&
    point.y >= -margin &&
    point.y <= BOARD_HEIGHT + margin
  );
}
