import { PACKET_RADIUS } from '@/config/constants';
import type { Vec2 } from '@/engine/math/vec2';
import type { RenderScene } from '@/engine/systems/RenderSystem';
import type { Landing } from '@/engine/systems/trajectory';

const GUIDE_HIT = '#2fb344';
const GUIDE_MISS = 'rgba(90, 107, 128, 0.55)';
const DANGER = '#ff5555';
const HEAD_COUNT = 3;

/**
 * Draws the two gameplay guides layered on the board: the dashed shot-trajectory
 * preview and the pulsing danger warning on the chain head. Kept out of
 * RenderSystem so the scene renderer stays under its size budget; view-only.
 */
export class GuideRenderer {
  trajectory(ctx: CanvasRenderingContext2D, from: Vec2, landing: Landing, time: number): void {
    const color = landing.hit ? GUIDE_HIT : GUIDE_MISS;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 9]);
    ctx.lineDashOffset = -time * 60;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(landing.point.x, landing.point.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (landing.hit) {
      const pulse = PACKET_RADIUS * (0.7 + Math.sin(time * 6) * 0.12);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(landing.point.x, landing.point.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  urgency(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
    const pulse = 0.55 + Math.sin(scene.fx.time * 8) * 0.45;
    const alpha = scene.urgency * pulse;
    const packets = scene.packets;
    const start = Math.max(0, packets.length - HEAD_COUNT);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = DANGER;
    for (let i = start; i < packets.length; i += 1) {
      const distance = scene.fx.renderDistanceFor(packets[i]!);
      if (distance < 0) {
        continue;
      }
      const pos = scene.path.pointAt(distance);
      // Nearer the front (higher index) glows harder, fading back along the head.
      ctx.globalAlpha = alpha * (0.4 + ((i - start) / HEAD_COUNT) * 0.6);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, PACKET_RADIUS * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
