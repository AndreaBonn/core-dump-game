import { VOID_RADIUS } from '@/config/constants';
import type { Chain } from '@/engine/entities/Chain';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { Path } from '@/engine/entities/Path';
import type { Projectile } from '@/engine/entities/Projectile';
import {
  fitViewport,
  screenToBoard as toBoard,
  viewportBoxFor,
  type Viewport,
} from '@/engine/core/viewport';
import { vec2, type Vec2 } from '@/engine/math/vec2';
import { BACKGROUND, RenderSystem, type RenderScene } from '@/engine/systems/RenderSystem';
import { predictLanding } from '@/engine/systems/trajectory';
import { frontUrgency } from '@/engine/systems/urgency';
import type { VisualFx } from '@/engine/systems/VisualFx';
import type { GamePhase } from '@/types/game.types';

/** Arc-length before the void within which the chain front reads as "in danger". */
const URGENCY_THRESHOLD = VOID_RADIUS * 6;

/** The simulation state a frame is drawn from, read but never written here. */
export interface Frame {
  phase: GamePhase;
  path: Path;
  chain: Chain;
  voidPosition: Vec2;
  cursor: CpuCursor;
  projectiles: readonly Projectile[];
  fx: VisualFx;
}

/**
 * The presentation edge of the engine: owns the fit-to-canvas viewport, the
 * device-pixel transform (with optional screen-shake offset), and the
 * RenderSystem. Keeps all screen/board coordinate mapping and the draw calls out
 * of the simulation, which never reads any of this.
 */
export class EngineRenderer {
  private readonly render: RenderSystem;
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
  private dpr = 1;

  constructor(boardWidth: number, boardHeight: number) {
    this.render = new RenderSystem(boardWidth, boardHeight);
  }

  /**
   * Resize the backing store and recompute the fit transform. Which part of the
   * board is fitted depends on the shape of the viewport, see `viewportBoxFor`.
   */
  configure(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, dpr: number): void {
    this.dpr = dpr;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    this.viewport = fitViewport(viewportBoxFor(cssWidth, cssHeight), cssWidth, cssHeight);
  }

  /** Map a client pointer position to board coordinates through the viewport. */
  screenToBoard(canvas: HTMLCanvasElement, clientX: number, clientY: number): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return toBoard(vec2(clientX - rect.left, clientY - rect.top), this.viewport);
  }

  /** Clear to the background and set the base transform, used while idle. */
  applyIdleTransform(ctx: CanvasRenderingContext2D): void {
    this.clearCanvas(ctx);
    this.setTransform(ctx, 0, 0);
  }

  /** Apply the transform (shifted by `shake`) and draw the scene. */
  draw(ctx: CanvasRenderingContext2D, shake: Vec2, scene: RenderScene): void {
    this.clearCanvas(ctx);
    this.setTransform(ctx, shake.x, shake.y);
    this.render.render(ctx, scene);
  }

  /**
   * Paint the whole backing store, not just the fitted board. In portrait the
   * canvas is taller than the fitted square, and the RenderSystem only clears
   * board coordinates: without this the bands above and below would keep
   * whatever the previous frame left there.
   */
  private clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Advance the visual effects by `dt` and draw one frame of the simulation.
   * Everything derived for presentation only, the aim guide and the danger
   * pulse, is computed here so the engine hands over state and nothing else.
   * Callers must not pass an idle frame: before the first level there are no
   * entities to read, and `applyIdleTransform` covers that case instead.
   */
  present(ctx: CanvasRenderingContext2D, frame: Frame, dt: number): void {
    const { chain, cursor, fx, path } = frame;
    fx.update(dt);
    fx.syncChain(chain.packets, dt);
    this.draw(ctx, fx.shakeOffset(), {
      path,
      packets: chain.packets,
      voidPosition: frame.voidPosition,
      cursor,
      projectiles: frame.projectiles,
      fx,
      trajectory:
        frame.phase === 'playing'
          ? predictLanding(cursor.position, cursor.angle, chain.packets, path)
          : null,
      urgency: frontUrgency(chain.frontDistance, path.length, URGENCY_THRESHOLD),
    });
  }

  private setTransform(ctx: CanvasRenderingContext2D, shakeX: number, shakeY: number): void {
    const { scale, offsetX, offsetY } = this.viewport;
    ctx.setTransform(
      scale * this.dpr,
      0,
      0,
      scale * this.dpr,
      (offsetX + shakeX) * this.dpr,
      (offsetY + shakeY) * this.dpr,
    );
  }
}
