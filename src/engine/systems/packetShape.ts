import type { Vec2 } from '@/engine/math/vec2';

const CORNER_RADIUS_FACTOR = 0.4;
const SHEEN_FADE_STOP = 0.45;
const SHEEN_TOP = 'rgba(255, 255, 255, 0.28)';
const SHEEN_BOTTOM = 'rgba(255, 255, 255, 0)';
const OUTLINE = 'rgba(0, 0, 0, 0.35)';
const OUTLINE_WIDTH = 2;
const HEX_VERTEX_COUNT = 6;
const FULL_TURN = Math.PI * 2;

/** Return flat-top hex vertices clockwise in canvas coordinates, starting at the rightmost point. */
export function hexVertices(center: Vec2, radius: number): readonly Vec2[] {
  return Array.from({ length: HEX_VERTEX_COUNT }, (_, index) => {
    const angle = (index * FULL_TURN) / HEX_VERTEX_COUNT;
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
  });
}

/** Return diamond vertices clockwise from the top, with both axis extents equal to radius. */
export function diamondVertices(center: Vec2, radius: number): readonly Vec2[] {
  return [
    { x: center.x, y: center.y - radius },
    { x: center.x + radius, y: center.y },
    { x: center.x, y: center.y + radius },
    { x: center.x - radius, y: center.y },
  ];
}

/** Draw the existing packet shape, optionally with its top-left volume highlight. */
export function drawRoundedSquare(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  style: { color: string; highlight: boolean },
): void {
  const size = radius * 2;
  const x = center.x - radius;
  const y = center.y - radius;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius * CORNER_RADIUS_FACTOR);
  paintPacketPath(ctx, center, radius, style);
}

/** Fill the current path with the shared packet sheen and outline. */
export function paintPacketPath(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  style: { color: string; highlight: boolean },
): void {
  ctx.fillStyle = style.color;
  ctx.fill();
  if (style.highlight) {
    const x = center.x - radius;
    const y = center.y - radius;
    const size = radius * 2;
    const sheen = ctx.createLinearGradient(x, y, x, y + size);
    sheen.addColorStop(0, SHEEN_TOP);
    sheen.addColorStop(SHEEN_FADE_STOP, SHEEN_BOTTOM);
    ctx.fillStyle = sheen;
    ctx.fill();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.stroke();
}
