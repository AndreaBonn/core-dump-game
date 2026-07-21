import { PACKET_RADIUS, VOID_RADIUS } from '@/config/constants';
import { colorForType, labelForType } from '@/config/packetTypes';
import type { Path } from '@/engine/entities/Path';
import type { Vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

const BACKGROUND = '#0a0e14';
const TRACE_OUTER = '#16351f';
const TRACE_INNER = '#2fb344';
const VOID_RING = '#ff5555';

export interface RenderScene {
  path: Path;
  packets: readonly DataPacket[];
  voidPosition: Vec2;
}

export class RenderSystem {
  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  render(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
    this.clear(ctx);
    this.drawPath(ctx, scene.path);
    this.drawVoid(ctx, scene.voidPosition);
    for (const packet of scene.packets) {
      if (packet.distance < -PACKET_RADIUS) {
        continue;
      }
      this.drawPacket(ctx, packet, scene.path.pointAt(packet.distance));
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
    this.strokePolyline(ctx, points, TRACE_OUTER, PACKET_RADIUS * 2 + 6);
    this.strokePolyline(ctx, points, BACKGROUND, PACKET_RADIUS * 2);
    ctx.setLineDash([2, 10]);
    this.strokePolyline(ctx, points, TRACE_INNER, 2);
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

  private drawVoid(ctx: CanvasRenderingContext2D, position: Vec2): void {
    const gradient = ctx.createRadialGradient(
      position.x,
      position.y,
      2,
      position.x,
      position.y,
      VOID_RADIUS * 1.8,
    );
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.7, '#05070b');
    gradient.addColorStop(1, 'rgba(10, 14, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, VOID_RADIUS * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = VOID_RING;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, VOID_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPacket(ctx: CanvasRenderingContext2D, packet: DataPacket, position: Vec2): void {
    const color = colorForType(packet.type);
    this.roundedSquare(ctx, position, PACKET_RADIUS, color);

    if (packet.isPowerUp) {
      ctx.strokeStyle = '#0a0e14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x, position.y, PACKET_RADIUS * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#0a0e14';
    ctx.font = `bold ${PACKET_RADIUS}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelForType(packet.type), position.x, position.y + 1);
  }

  private roundedSquare(
    ctx: CanvasRenderingContext2D,
    center: Vec2,
    radius: number,
    color: string,
  ): void {
    const size = radius * 2;
    const x = center.x - radius;
    const y = center.y - radius;
    const cornerRadius = radius * 0.4;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, cornerRadius);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
