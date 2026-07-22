import { CURSOR_RADIUS, PACKET_RADIUS, VOID_RADIUS } from '@/config/constants';
import { colorForType, labelForType } from '@/config/packetTypes';
import { POWER_UPS } from '@/config/powerUps';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { Path } from '@/engine/entities/Path';
import type { Projectile } from '@/engine/entities/Projectile';
import type { Vec2 } from '@/engine/math/vec2';
import { FxRenderer } from '@/engine/systems/FxRenderer';
import { GuideRenderer } from '@/engine/systems/GuideRenderer';
import type { Landing } from '@/engine/systems/trajectory';
import type { VisualFx } from '@/engine/systems/VisualFx';
import type { DataPacket } from '@/types/game.types';

const BACKGROUND = '#0a0e14';
const TRACE_OUTER = '#123024';
const TRACE_GLOW = '#2fb344';
const VOID_RING = '#ff5555';
const CURSOR_BODY = '#1e2a38';
const CURSOR_PIN = '#2fb344';
const INK = '#0a0e14';

export interface RenderScene {
  path: Path;
  packets: readonly DataPacket[];
  voidPosition: Vec2;
  cursor: CpuCursor;
  projectiles: readonly Projectile[];
  fx: VisualFx;
  /** Predicted landing of the current shot, or null when not aiming. */
  trajectory: Landing | null;
  /** Danger level of the chain front, 0..1, driving the head-of-chain warning. */
  urgency: number;
}

export class RenderSystem {
  private readonly fxRenderer = new FxRenderer();
  private readonly guides = new GuideRenderer();

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  render(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
    this.clear(ctx);
    this.drawPath(ctx, scene.path);
    this.drawVoid(ctx, scene.voidPosition, scene.fx.time);
    if (scene.trajectory) {
      this.guides.trajectory(ctx, scene.cursor.position, scene.trajectory, scene.fx.time);
    }
    for (const packet of scene.packets) {
      const distance = scene.fx.renderDistanceFor(packet);
      if (distance < -PACKET_RADIUS) {
        continue;
      }
      this.drawPacket(ctx, packet, scene.path.pointAt(distance), scene.fx.popScaleFor(packet.id));
    }
    if (scene.urgency > 0) {
      this.guides.urgency(ctx, scene);
    }
    for (const projectile of scene.projectiles) {
      this.drawProjectile(ctx, projectile);
    }
    this.drawCursor(ctx, scene.cursor, scene.fx.time);
    this.fxRenderer.render(ctx, scene.fx);
  }

  private clear(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawPath(ctx: CanvasRenderingContext2D, path: Path): void {
    const points = path.polyline;
    if (points.length < 2) {
      return;
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Recessed channel the chain rides in, then a soft neon centre line.
    this.strokePolyline(ctx, points, TRACE_OUTER, PACKET_RADIUS * 2 + 8);
    this.strokePolyline(ctx, points, BACKGROUND, PACKET_RADIUS * 2);
    ctx.save();
    ctx.shadowColor = TRACE_GLOW;
    ctx.shadowBlur = 10;
    ctx.setLineDash([2, 12]);
    this.strokePolyline(ctx, points, TRACE_GLOW, 2);
    ctx.restore();
    ctx.setLineDash([]);
  }

  private strokePolyline(
    ctx: CanvasRenderingContext2D,
    points: readonly Vec2[],
    color: string,
    lineWidth: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  private drawVoid(ctx: CanvasRenderingContext2D, position: Vec2, time: number): void {
    const outer = VOID_RADIUS * 1.8;
    const gradient = ctx.createRadialGradient(
      position.x,
      position.y,
      2,
      position.x,
      position.y,
      outer,
    );
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.7, '#05070b');
    gradient.addColorStop(1, 'rgba(10, 14, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, outer, 0, Math.PI * 2);
    ctx.fill();

    // Slowly rotating accretion ring, plus a breathing hazard ring.
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(time * 0.6);
    ctx.strokeStyle = 'rgba(255, 85, 85, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, VOID_RADIUS * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);

    const pulse = VOID_RADIUS + Math.sin(time * 3) * 1.5;
    ctx.strokeStyle = VOID_RING;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPacket(ctx: CanvasRenderingContext2D, packet: DataPacket, position: Vec2, scale = 1): void {
    const color = colorForType(packet.type);
    const radius = PACKET_RADIUS * scale;
    this.roundedSquare(ctx, position, radius, color, true);

    if (packet.isPowerUp && packet.powerUpType) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }

    const glyph =
      packet.isPowerUp && packet.powerUpType
        ? POWER_UPS[packet.powerUpType].glyph
        : labelForType(packet.type);
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(PACKET_RADIUS * scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, position.x, position.y + 1);
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile): void {
    const { position, velocity, type } = projectile;
    const color = colorForType(type);
    const speed = Math.hypot(velocity.x, velocity.y) || 1;
    const dirX = velocity.x / speed;
    const dirY = velocity.y / speed;

    // Fading motion trail behind the projectile.
    ctx.save();
    for (let i = 1; i <= 4; i += 1) {
      const back = i * PACKET_RADIUS * 0.7;
      ctx.globalAlpha = 0.28 - i * 0.05;
      this.roundedSquare(
        ctx,
        { x: position.x - dirX * back, y: position.y - dirY * back },
        PACKET_RADIUS * (1 - i * 0.14),
        color,
        false,
      );
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    this.roundedSquare(ctx, position, PACKET_RADIUS, color, true);
    ctx.restore();
  }

  private drawCursor(ctx: CanvasRenderingContext2D, cursor: CpuCursor, time: number): void {
    const { position, angle } = cursor;

    ctx.strokeStyle = 'rgba(47, 179, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + Math.cos(angle) * 90, position.y + Math.sin(angle) * 90);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);
    ctx.fillStyle = CURSOR_PIN;
    const pin = CURSOR_RADIUS * 0.9;
    for (const offset of [-0.5, 0, 0.5]) {
      ctx.fillRect(pin, offset * CURSOR_RADIUS - 3, 8, 6);
    }
    ctx.restore();

    this.roundedSquare(ctx, position, CURSOR_RADIUS, CURSOR_BODY, false);
    ctx.save();
    ctx.shadowColor = colorForType(cursor.currentType);
    ctx.shadowBlur = 12;
    this.roundedSquare(ctx, position, PACKET_RADIUS * 0.7, colorForType(cursor.currentType), true);
    ctx.restore();
  }

  private roundedSquare(
    ctx: CanvasRenderingContext2D,
    center: Vec2,
    radius: number,
    color: string,
    highlight: boolean,
  ): void {
    const size = radius * 2;
    const x = center.x - radius;
    const y = center.y - radius;
    const cornerRadius = radius * 0.4;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, cornerRadius);
    ctx.fillStyle = color;
    ctx.fill();
    if (highlight) {
      // Top-left sheen for a bit of volume over the flat fill.
      const sheen = ctx.createLinearGradient(x, y, x, y + size);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
