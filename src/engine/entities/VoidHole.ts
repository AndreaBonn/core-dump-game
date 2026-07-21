import type { Vec2 } from '@/engine/math/vec2';

/** The `/dev/null` sink at the end of the path. Reaching it ends the game. */
export class VoidHole {
  constructor(
    readonly position: Vec2,
    readonly pathLength: number,
  ) {}

  /** True when a packet at `frontDistance` has reached the void threshold. */
  hasSwallowed(frontDistance: number, threshold: number): boolean {
    return frontDistance >= this.pathLength - threshold;
  }
}
