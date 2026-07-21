import type { Vec2 } from '@/engine/math/vec2';

export interface InputHandlers {
  onAim: (boardPoint: Vec2) => void;
  onFire: (boardPoint: Vec2) => void;
}

/**
 * Translates pointer and touch events on the canvas into aim/fire actions in
 * board coordinates. On desktop the pointer aims and a click fires; on touch a
 * tap aims and fires in one gesture (spec 4.2).
 */
export class InputSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly handlers: InputHandlers;
  private readonly toBoard: (clientX: number, clientY: number) => Vec2;

  constructor(
    canvas: HTMLCanvasElement,
    handlers: InputHandlers,
    toBoard: (clientX: number, clientY: number) => Vec2,
  ) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.toBoard = toBoard;
    this.attach();
  }

  private attach(): void {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    this.handlers.onAim(this.toBoard(event.clientX, event.clientY));
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const point = this.toBoard(event.clientX, event.clientY);
    this.handlers.onAim(point);
    this.handlers.onFire(point);
  };
}
