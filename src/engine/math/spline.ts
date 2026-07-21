import type { Vec2 } from './vec2';

/**
 * A polyline approximation of a smooth curve, annotated with the cumulative
 * arc length at each sample. This lets callers map a distance travelled along
 * the curve to a concrete point at uniform speed, regardless of curvature.
 */
export interface SampledCurve {
  readonly points: readonly Vec2[];
  readonly cumulativeLength: readonly number[];
  readonly totalLength: number;
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Build a sampled Catmull-Rom curve through the given waypoints. The endpoints
 * are duplicated as phantom control points so the curve passes through the
 * first and last waypoint. `samplesPerSegment` controls smoothness.
 */
export function sampleCatmullRom(
  waypoints: readonly Vec2[],
  samplesPerSegment = 24,
): SampledCurve {
  if (waypoints.length < 2) {
    throw new Error('A path needs at least two waypoints');
  }

  const points: Vec2[] = [];
  const first = waypoints[0]!;
  const last = waypoints[waypoints.length - 1]!;

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const p0 = i === 0 ? first : waypoints[i - 1]!;
    const p1 = waypoints[i]!;
    const p2 = waypoints[i + 1]!;
    const p3 = i + 2 < waypoints.length ? waypoints[i + 2]! : last;

    const lastSegment = i === waypoints.length - 2;
    const steps = lastSegment ? samplesPerSegment : samplesPerSegment - 1;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / samplesPerSegment;
      points.push(catmullRom(p0, p1, p2, p3, t));
    }
  }

  const cumulativeLength: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const segment = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    cumulativeLength.push(cumulativeLength[i - 1]! + segment);
  }

  return {
    points,
    cumulativeLength,
    totalLength: cumulativeLength[cumulativeLength.length - 1]!,
  };
}

function findSampleIndex(cumulative: readonly number[], distance: number): number {
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid]! < distance) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/** Point on the curve at the given arc-length distance (clamped to the curve). */
export function pointAtDistance(curve: SampledCurve, distance: number): Vec2 {
  const clamped = Math.max(0, Math.min(distance, curve.totalLength));
  const index = findSampleIndex(curve.cumulativeLength, clamped);
  if (index === 0) {
    return curve.points[0]!;
  }
  const before = curve.points[index - 1]!;
  const after = curve.points[index]!;
  const startLength = curve.cumulativeLength[index - 1]!;
  const endLength = curve.cumulativeLength[index]!;
  const span = endLength - startLength;
  const t = span === 0 ? 0 : (clamped - startLength) / span;
  return {
    x: before.x + (after.x - before.x) * t,
    y: before.y + (after.y - before.y) * t,
  };
}

/** Unit tangent (direction of travel) at the given arc-length distance. */
export function tangentAtDistance(curve: SampledCurve, distance: number): Vec2 {
  const epsilon = Math.min(1, curve.totalLength);
  const ahead = pointAtDistance(curve, distance + epsilon);
  const behind = pointAtDistance(curve, distance - epsilon);
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return { x: 1, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}
