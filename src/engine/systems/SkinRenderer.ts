import { PACKET_RADIUS } from '@/config/constants';
import type { Projectile } from '@/engine/entities/Projectile';
import type { Vec2 } from '@/engine/math/vec2';
import {
  diamondVertices,
  drawRoundedSquare,
  hexVertices,
  paintPacketPath,
} from '@/engine/systems/packetShape';
import type { ChainSkin, CursorSkin, Theme } from '@/engine/systems/theme';

const FULL_TURN = Math.PI * 2;
const RING_WIDTH = 2;
const TRAIL_SAMPLES = 4;
const TRAIL_SPACING = 0.7;
const TRAIL_ALPHA = 0.28;
const TRAIL_ALPHA_STEP = 0.05;
const TRAIL_SHRINK_STEP = 0.14;

interface ShapeBounds {
  center: Vec2;
  radius: number;
}

function tracePolygon(ctx: CanvasRenderingContext2D, vertices: readonly Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
  for (const vertex of vertices.slice(1)) {
    ctx.lineTo(vertex.x, vertex.y);
  }
  ctx.closePath();
}

/** Draw a chain skin with the classic packet finish, falling back to the rounded square. */
export function drawChainShape(
  ctx: CanvasRenderingContext2D,
  chainSkin: ChainSkin,
  { center, radius }: ShapeBounds,
  style: { color: string; highlight: boolean },
): void {
  if (chainSkin.id === 'circle') {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, FULL_TURN);
  } else if (chainSkin.id === 'hex') {
    tracePolygon(ctx, hexVertices(center, radius));
  } else {
    drawRoundedSquare(ctx, center, radius, style);
    return;
  }
  paintPacketPath(ctx, center, radius, style);
}

/** Draw the loaded indicator skin without changing the caller's shadow settings. */
export function drawCursorSkin(
  ctx: CanvasRenderingContext2D,
  cursorSkin: CursorSkin,
  { center, radius }: ShapeBounds,
  color: string,
): void {
  if (cursorSkin.id === 'ring') {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, FULL_TURN);
    ctx.strokeStyle = color;
    ctx.lineWidth = RING_WIDTH;
    ctx.stroke();
    return;
  }
  if (cursorSkin.id === 'diamond') {
    tracePolygon(ctx, diamondVertices(center, radius));
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }
  drawRoundedSquare(ctx, center, radius, { color, highlight: true });
}

/** Draw the fading motion trail using the same skin as the projectile body. */
export function drawProjectileTrail(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  theme: Theme,
): void {
  const { position, velocity, type } = projectile;
  const color = theme.packetColor(type);
  const speed = Math.hypot(velocity.x, velocity.y) || 1;
  ctx.save();
  for (let index = 1; index <= TRAIL_SAMPLES; index += 1) {
    const back = index * PACKET_RADIUS * TRAIL_SPACING;
    const center = {
      x: position.x - (velocity.x / speed) * back,
      y: position.y - (velocity.y / speed) * back,
    };
    const radius = PACKET_RADIUS * (1 - index * TRAIL_SHRINK_STEP);
    ctx.globalAlpha = TRAIL_ALPHA - index * TRAIL_ALPHA_STEP;
    drawChainShape(ctx, theme.chain, { center, radius }, { color, highlight: false });
  }
  ctx.restore();
}
