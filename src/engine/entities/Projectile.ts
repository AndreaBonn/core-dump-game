import { PROJECTILE_SPEED } from '@/config/constants';
import { vec2, type Vec2 } from '@/engine/math/vec2';
import type { PacketType } from '@/types/game.types';

let nextProjectileId = 1;

export function resetProjectileIds(): void {
  nextProjectileId = 1;
}

/** A packet in flight after being fired, moving in a straight line. */
export class Projectile {
  readonly id: number;
  position: Vec2;
  readonly velocity: Vec2;

  constructor(
    origin: Vec2,
    angle: number,
    readonly type: PacketType,
  ) {
    this.id = nextProjectileId++;
    this.position = origin;
    this.velocity = vec2(Math.cos(angle) * PROJECTILE_SPEED, Math.sin(angle) * PROJECTILE_SPEED);
  }

  advance(dt: number): void {
    this.position = {
      x: this.position.x + this.velocity.x * dt,
      y: this.position.y + this.velocity.y * dt,
    };
  }
}
