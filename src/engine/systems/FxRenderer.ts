import type { VisualFx } from '@/engine/systems/VisualFx';

/**
 * Draws the transient visual effects (additive particle bursts and fading
 * shockwave rings) held by VisualFx. Kept separate from RenderSystem so the
 * scene renderer stays focused on the persistent board.
 */
export class FxRenderer {
  render(ctx: CanvasRenderingContext2D, fx: VisualFx): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.activeParticles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (const r of fx.activeRipples) {
      const t = r.age / r.duration;
      const radius = r.fromRadius + (r.toRadius - r.fromRadius) * t;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
