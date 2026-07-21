import { BOARD_HEIGHT, BOARD_WIDTH } from '@/config/constants';
import { vec2, type Vec2 } from '@/engine/math/vec2';

export interface SpiralSpec {
  turns: number;
  startRadius: number;
  endRadius: number;
  /** Number of waypoints; more waypoints give the spline a smoother base. */
  waypoints: number;
}

const CENTER: Vec2 = vec2(BOARD_WIDTH / 2, BOARD_HEIGHT / 2);

/**
 * Build an inward spiral of waypoints around the board centre. The chain enters
 * at the outer radius and flows toward the void near the centre (the last
 * waypoint). Levels vary the number of turns and radii to change the path.
 */
export function buildSpiral(spec: SpiralSpec): Vec2[] {
  const { turns, startRadius, endRadius, waypoints } = spec;
  const points: Vec2[] = [];
  const totalAngle = turns * Math.PI * 2;
  for (let i = 0; i < waypoints; i += 1) {
    const t = i / (waypoints - 1);
    const angle = t * totalAngle;
    const radius = startRadius + (endRadius - startRadius) * t;
    points.push(vec2(CENTER.x + Math.cos(angle) * radius, CENTER.y + Math.sin(angle) * radius));
  }
  return points;
}

export const BOARD_CENTER: Vec2 = CENTER;
