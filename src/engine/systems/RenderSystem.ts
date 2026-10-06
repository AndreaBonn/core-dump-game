import { CURSOR_RADIUS, PACKET_RADIUS, VOID_RADIUS } from '@/config/constants';
import { HAZARD_COLOR, labelForType } from '@/config/packetTypes';
import { POWER_UPS } from '@/config/powerUps';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { Path } from '@/engine/entities/Path';
import type { Projectile } from '@/engine/entities/Projectile';
import type { Vec2 } from '@/engine/math/vec2';
import { FxRenderer } from '@/engine/systems/FxRenderer';
import { GuideRenderer } from '@/engine/systems/GuideRenderer';
import { drawArmor, drawReversal } from '@/engine/systems/MechanicRenderer';
import type { Landing } from '@/engine/systems/trajectory';
import type { VisualFx } from '@/engine/systems/VisualFx';
import type { DataPacket } from '@/types/game.types';
import { DEFAULT_THEME, type Theme } from '@/engine/systems/theme';
import { drawRoundedSquare } from '@/engine/systems/packetShape';
import { drawChainShape, drawCursorSkin, drawProjectileTrail } from '@/engine/systems/SkinRenderer';

/** Board background, also used to clear the canvas outside the fitted board. */
export const BACKGROUND = '#0a0e14';
const TRACE_OUTER = '#123024';
const TRACE_GLOW = '#2fb344';
const VOID_RING = '#ff5555';
const CURSOR_BODY = '#1e2a38';
const CURSOR_PIN = '#2fb344';
export const INK = BACKGROUND;
const HAZARD_MARK = '#0a0e14';
const LOADED_PACKET_SCALE = 0.7;

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
  /** Reversal cue strength, 0..1: ramps up before the chain backs off, 1 while it does. */
  reversalPhase: number;
  theme: Theme;
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
      this.drawPacket(
        ctx,
        packet,
        scene.path.pointAt(distance),
        scene.fx.popScaleFor(packet.id),
        scene.theme,
      );
    }
    if (scene.urgency > 0) {
      this.guides.urgency(ctx, scene);
    }
    this.drawProjectiles(ctx, scene);
    this.drawCursor(ctx, scene.cursor, scene.fx.time, scene.theme);
    this.fxRenderer.render(ctx, scene.fx);
    drawReversal(ctx, scene.voidPosition, scene.reversalPhase);
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
    for (const projectile of scene.projectiles) {
      this.fxRenderer.tracer(
        ctx,
        scene.fx.tracerFor(projectile.id),
        scene.theme.packetColor(projectile.type),
      );
      this.drawProjectile(ctx, projectile, scene.theme);
    }
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

  /** Draw a packet with optional scale and theme; direct callers retain classic by default. */
  drawPacket(
    ctx: CanvasRenderingContext2D,
    packet: DataPacket,
    position: Vec2,
    scale = 1,
    theme: Theme = DEFAULT_THEME,
  ): void {
    const radius = PACKET_RADIUS * scale;
    if (!packet.matchable) {
      this.drawHazard(ctx, position, radius);
      return;
    }
    const color = theme.packetColor(packet.type);
    drawChainShape(ctx, theme.chain, { center: position, radius }, { color, highlight: true });
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
    if (packet.armor > 0) {
      drawArmor(ctx, position, packet.armor, radius);
    }
  }

  /**
   * A hazard: dead grey and crossed out, so it reads as "not part of any
   * match" by shape as well as by colour, on a greyscale screen too.
   */
  private drawHazard(ctx: CanvasRenderingContext2D, position: Vec2, radius: number): void {
    drawRoundedSquare(ctx, position, radius, { color: HAZARD_COLOR, highlight: false });
    ctx.strokeStyle = HAZARD_MARK;
    ctx.lineWidth = Math.max(2, radius * 0.18);
    ctx.lineCap = 'round';
    const arm = radius * 0.5;
    ctx.beginPath();
    ctx.moveTo(position.x - arm, position.y - arm);
    ctx.lineTo(position.x + arm, position.y + arm);
    ctx.moveTo(position.x + arm, position.y - arm);
    ctx.lineTo(position.x - arm, position.y + arm);
    ctx.stroke();
  }

  private drawProjectile(
    ctx: CanvasRenderingContext2D,
    projectile: Projectile,
    theme: Theme,
  ): void {
    const { position, type } = projectile;
    const color = theme.packetColor(type);
    drawProjectileTrail(ctx, projectile, theme);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    drawChainShape(
      ctx,
      theme.chain,
      { center: position, radius: PACKET_RADIUS },
      { color, highlight: true },
    );
    ctx.restore();
  }

  private drawCursor(
    ctx: CanvasRenderingContext2D,
    cursor: CpuCursor,
    time: number,
    theme: Theme,
  ): void {
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

    drawRoundedSquare(ctx, position, CURSOR_RADIUS, { color: CURSOR_BODY, highlight: false });
    ctx.save();
    ctx.shadowColor = theme.packetColor(cursor.currentType);
    ctx.shadowBlur = 12;
    drawCursorSkin(
      ctx,
      theme.cursor,
      { center: position, radius: PACKET_RADIUS * LOADED_PACKET_SCALE },
      theme.packetColor(cursor.currentType),
    );
    ctx.restore();
  }
}
