import { PACKET_RADIUS, VOID_RADIUS } from '@/config/constants';
import type { Vec2 } from '@/engine/math/vec2';

const OUTER_RADIUS_RATIO = 0.9;
const INNER_RADIUS_RATIO = 0.7;
const LEVEL_INSET_RATIO = 0.4;
const BACKING_WIDTH_RATIO = 0.18;
const OUTLINE_WIDTH_RATIO = 0.06;
const ARMOR_BACKING = '#0a0e14';
const ARMOR_OUTLINE = '#ffffff';
const REVERSAL_COLOR = '#ffd166';
const CUE_WIDTH = 44;
const CUE_HEIGHT = 24;
const CUE_GAP = 8;
const CHEVRON_SPACING = 16;
const CHEVRON_HALF_HEIGHT = 7;
const CHEVRON_MIN_REACH = 4;
const CHEVRON_GROWTH = 5;
const CHEVRON_WIDTH = 3;

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

/** Returns a fixed visible phase for reduced motion, avoiding animated warning geometry. */
export function reversalCuePhase(phase: number, reducedMotion: boolean): number {
  return reducedMotion && phase > 0 ? 1 : phase;
}

/** Draws rewind chevrons above the void; solid ink preserves contrast throughout the ramp. */
export function drawReversal(ctx: CanvasRenderingContext2D, position: Vec2, phase: number): void {
  if (phase <= 0) return;
  const y = position.y - VOID_RADIUS - CUE_GAP - CUE_HEIGHT / 2;
  const reach = CHEVRON_MIN_REACH + phase * CHEVRON_GROWTH;
  ctx.save();
  ctx.fillStyle = ARMOR_BACKING;
  ctx.fillRect(position.x - CUE_WIDTH / 2, y - CUE_HEIGHT / 2, CUE_WIDTH, CUE_HEIGHT);
  ctx.strokeStyle = REVERSAL_COLOR;
  ctx.lineWidth = CHEVRON_WIDTH;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const offset of [-CHEVRON_SPACING / 2, CHEVRON_SPACING / 2]) {
    const x = position.x + offset;
    ctx.moveTo(x + reach / 2, y - CHEVRON_HALF_HEIGHT);
    ctx.lineTo(x - reach / 2, y);
    ctx.lineTo(x + reach / 2, y + CHEVRON_HALF_HEIGHT);
  }
  ctx.stroke();
  ctx.restore();
}
