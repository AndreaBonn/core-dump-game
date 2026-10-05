import { PACKET_RADIUS } from '@/config/constants';
import type { Vec2 } from '@/engine/math/vec2';

const OUTER_RADIUS_RATIO = 0.9;
const INNER_RADIUS_RATIO = 0.7;
const LEVEL_INSET_RATIO = 0.4;
const BACKING_WIDTH_RATIO = 0.18;
const OUTLINE_WIDTH_RATIO = 0.06;
const ARMOR_BACKING = '#0a0e14';
const ARMOR_OUTLINE = '#ffffff';

/** Returns two concentric square radii per armor level, scaled with the packet. */
export function armorRingRadii(armor: number, radius = PACKET_RADIUS): readonly number[] {
  return Array.from({ length: armor }, (_, level) => [
    radius * (OUTER_RADIUS_RATIO - level * LEVEL_INSET_RATIO),
    radius * (INNER_RADIUS_RATIO - level * LEVEL_INSET_RATIO),
  ]).flat();
}

/** Draws angular double outlines with a dark backing to separate them from every packet color. */
export function drawArmor(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  armor: number,
  radius = PACKET_RADIUS,
): void {
  ctx.save();
  ctx.lineJoin = 'miter';
  for (const ring of armorRingRadii(armor, radius)) {
    const x = position.x - ring;
    const y = position.y - ring;
    const size = ring * 2;
    ctx.strokeStyle = ARMOR_BACKING;
    ctx.lineWidth = radius * BACKING_WIDTH_RATIO;
    ctx.strokeRect(x, y, size, size);
    ctx.strokeStyle = ARMOR_OUTLINE;
    ctx.lineWidth = radius * OUTLINE_WIDTH_RATIO;
    ctx.strokeRect(x, y, size, size);
  }
  ctx.restore();
}
