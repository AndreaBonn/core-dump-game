import { angleOf, subtract, type Vec2 } from '@/engine/math/vec2';
import type { PacketType } from '@/types/game.types';

/**
 * The player-controlled shooter at the board centre. Holds the packet ready to
 * fire and a preview of the next one (a queue of two, per spec 4.1).
 */
export class CpuCursor {
  angle = -Math.PI / 2;

  constructor(
    readonly position: Vec2,
    public currentType: PacketType,
    public nextType: PacketType,
  ) {}

  aimAt(target: Vec2): void {
    this.angle = angleOf(subtract(target, this.position));
  }

  /**
   * Fire the current packet and advance the queue: the next packet becomes
   * current and `incoming` becomes the new preview. Returns the fired type.
   */
  loadNext(incoming: PacketType): PacketType {
    const fired = this.currentType;
    this.currentType = this.nextType;
    this.nextType = incoming;
    return fired;
  }
}
