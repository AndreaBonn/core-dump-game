import {
  pointAtDistance,
  sampleCatmullRom,
  tangentAtDistance,
  type SampledCurve,
} from '@/engine/math/spline';
import type { Vec2 } from '@/engine/math/vec2';

/**
 * The circuit trace the chain travels along. Built once from waypoints into an
 * arc-length parametrised curve so packets advance at uniform speed.
 */
export class Path {
  private readonly curve: SampledCurve;

  constructor(waypoints: readonly Vec2[]) {
    this.curve = sampleCatmullRom(waypoints);
  }

  get length(): number {
    return this.curve.totalLength;
  }

  get polyline(): readonly Vec2[] {
    return this.curve.points;
  }

  /** The void `/dev/null` position: the very end of the path. */
  get voidPosition(): Vec2 {
    return pointAtDistance(this.curve, this.curve.totalLength);
  }

  pointAt(distance: number): Vec2 {
    return pointAtDistance(this.curve, distance);
  }

  tangentAt(distance: number): Vec2 {
    return tangentAtDistance(this.curve, distance);
  }
}
