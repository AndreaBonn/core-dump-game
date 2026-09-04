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

/** The shapes a level's track can take. */
export type PathKind = 'spiral' | 'serpentine' | 'loop';

export interface TrackSpec {
  kind: PathKind;
  /** Half-width of the square the track must stay inside, in board pixels. */
  reach: number;
  waypoints: number;
  /** Turns for the spiral, rows for the serpentine, laps for the loop. */
  sweeps: number;
}

/**
 * A track that folds back on itself in rows, then drops to the void at the
 * centre. Reads as a queue being scanned line by line rather than wound in.
 */
export function buildSerpentine(spec: TrackSpec): Vec2[] {
  const { reach, waypoints, sweeps } = spec;
  const rows = Math.max(2, Math.round(sweeps));
  const points: Vec2[] = [];
  for (let i = 0; i < waypoints; i += 1) {
    const t = i / (waypoints - 1);
    // One full left-right sweep per row, alternating direction.
    const row = Math.min(rows - 1, Math.floor(t * rows));
    const withinRow = t * rows - row;
    const goingRight = row % 2 === 0;
    const x = (goingRight ? -1 : 1) * reach * (1 - 2 * withinRow) * -1;
    const y = -reach + (2 * reach * (row + withinRow)) / rows;
    // Ease the last stretch into the centre, where the void sits.
    const pull = Math.max(0, (t - 0.85) / 0.15);
    points.push(
      vec2(CENTER.x + x * (1 - pull), CENTER.y + y * (1 - pull)),
    );
  }
  return points;
}

/**
 * A track that laps at a steady radius before spiralling in. The constant part
 * gives the player a stable target; the drop at the end is the pressure.
 */
export function buildLoop(spec: TrackSpec): Vec2[] {
  const { reach, waypoints, sweeps } = spec;
  const totalAngle = Math.max(1, sweeps) * Math.PI * 2;
  const points: Vec2[] = [];
  for (let i = 0; i < waypoints; i += 1) {
    const t = i / (waypoints - 1);
    const angle = t * totalAngle;
    // Hold the radius for the first two thirds, then fall towards the void.
    const fall = Math.max(0, (t - 0.66) / 0.34);
    const radius = reach * (1 - fall) + 54 * fall;
    points.push(vec2(CENTER.x + Math.cos(angle) * radius, CENTER.y + Math.sin(angle) * radius));
  }
  return points;
}

/** Build the track of a level from its shape. */
export function buildTrack(spec: TrackSpec): Vec2[] {
  switch (spec.kind) {
    case 'serpentine':
      return buildSerpentine(spec);
    case 'loop':
      return buildLoop(spec);
    case 'spiral':
      return buildSpiral({
        turns: spec.sweeps,
        startRadius: spec.reach,
        endRadius: 54,
        waypoints: spec.waypoints,
      });
  }
}

export const BOARD_CENTER: Vec2 = CENTER;
