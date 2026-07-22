import { vec2, type Vec2 } from '@/engine/math/vec2';
import { RenderSystem, type RenderScene } from '@/engine/systems/RenderSystem';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
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

  constructor(
    private readonly boardWidth: number,
    private readonly boardHeight: number,
  ) {
    this.render = new RenderSystem(boardWidth, boardHeight);
  }

  /** Resize the backing store and recompute the letterboxed fit transform. */
  configure(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, dpr: number): void {
    this.dpr = dpr;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const scale = Math.min(cssWidth / this.boardWidth, cssHeight / this.boardHeight);
    this.viewport = {
      scale,
      offsetX: (cssWidth - this.boardWidth * scale) / 2,
      offsetY: (cssHeight - this.boardHeight * scale) / 2,
    };
  }

  /** Map a client pointer position to board coordinates through the viewport. */
  screenToBoard(canvas: HTMLCanvasElement, clientX: number, clientY: number): Vec2 {
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = this.viewport;
    return vec2((clientX - rect.left - offsetX) / scale, (clientY - rect.top - offsetY) / scale);
  }

  /** Set only the base transform, used before the first frame and while idle. */
  applyIdleTransform(ctx: CanvasRenderingContext2D): void {
    this.setTransform(ctx, 0, 0);
  }

  /** Apply the transform (shifted by `shake`) and draw the scene. */
  draw(ctx: CanvasRenderingContext2D, shake: Vec2, scene: RenderScene): void {
    this.setTransform(ctx, shake.x, shake.y);
    this.render.render(ctx, scene);
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
