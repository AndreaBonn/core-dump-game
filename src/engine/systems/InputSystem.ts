import { vec2, type Vec2 } from '@/engine/math/vec2';

export interface InputHandlers {
  onAim: (boardPoint: Vec2) => void;
  onFire: (boardPoint: Vec2) => void;
  onSwap: () => void;
}

/**
 * Translates pointer, touch and keyboard events into aim/fire/swap actions in
 * board coordinates. On desktop the pointer aims and a click fires; on touch a
 * tap aims and fires in one gesture (spec 4.2); Space fires and S swaps.
 */
export class InputSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly handlers: InputHandlers;
  private readonly toBoard: (clientX: number, clientY: number) => Vec2;
  /** Last aimed point, replayed when firing from the keyboard. */
  private lastAim: Vec2 = vec2(0, 0);

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
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      // Space would scroll the page, and the canvas is the whole viewport.
      event.preventDefault();
      this.handlers.onFire(this.lastAim);
    }
    if (event.code === 'KeyS') {
      this.handlers.onSwap();
    }
  };

  private onContextMenu = (event: Event): void => {
    // Right-click is the swap gesture, so suppress the browser menu.
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    this.lastAim = this.toBoard(event.clientX, event.clientY);
    this.handlers.onAim(this.lastAim);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button === 2) {
      this.handlers.onSwap();
      return;
    }
    if (event.button !== 0) {
      return;
    }
    this.lastAim = this.toBoard(event.clientX, event.clientY);
    this.handlers.onAim(this.lastAim);
    this.handlers.onFire(this.lastAim);
  };
}
