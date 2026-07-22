import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem, type InputHandlers } from '@/engine/systems/InputSystem';
import { vec2, type Vec2 } from '@/engine/math/vec2';

/** Dispatch a pointer-like event with the fields InputSystem reads. */
function dispatch(
  target: EventTarget,
  type: 'pointermove' | 'pointerdown',
  props: { pointerType?: string; button?: number; clientX: number; clientY: number },
): void {
  const event = new Event(type);
  Object.assign(event, { pointerType: 'mouse', button: 0, ...props });
  target.dispatchEvent(event);
}

describe('InputSystem', () => {
  let canvas: HTMLCanvasElement;
  let handlers: {
    onAim: ReturnType<typeof vi.fn>;
    onFire: ReturnType<typeof vi.fn>;
    onSwap: ReturnType<typeof vi.fn>;
  };
  let input: InputSystem;
  const toBoard = (clientX: number, clientY: number): Vec2 => vec2(clientX, clientY);

  beforeEach(() => {
    canvas = document.createElement('canvas');
    handlers = { onAim: vi.fn(), onFire: vi.fn(), onSwap: vi.fn() };
    input = new InputSystem(canvas, handlers as unknown as InputHandlers, toBoard);
  });

  it('aims toward the pointer on mouse move, mapped to board coordinates', () => {
    dispatch(canvas, 'pointermove', { pointerType: 'mouse', clientX: 40, clientY: 70 });
    expect(handlers.onAim).toHaveBeenCalledWith(vec2(40, 70));
    expect(handlers.onFire).not.toHaveBeenCalled();
  });

  it('ignores move events from touch pointers (tap aims and fires instead)', () => {
    dispatch(canvas, 'pointermove', { pointerType: 'touch', clientX: 40, clientY: 70 });
    expect(handlers.onAim).not.toHaveBeenCalled();
  });

  it('aims and fires on a left-button press', () => {
    dispatch(canvas, 'pointerdown', { button: 0, clientX: 10, clientY: 20 });
    expect(handlers.onAim).toHaveBeenCalledWith(vec2(10, 20));
    expect(handlers.onFire).toHaveBeenCalledWith(vec2(10, 20));
  });

  it('swaps on a right-button press without aiming or firing', () => {
    dispatch(canvas, 'pointerdown', { button: 2, clientX: 10, clientY: 20 });
    expect(handlers.onSwap).toHaveBeenCalledTimes(1);
    expect(handlers.onAim).not.toHaveBeenCalled();
    expect(handlers.onFire).not.toHaveBeenCalled();
  });

  it('ignores middle-button presses', () => {
    dispatch(canvas, 'pointerdown', { button: 1, clientX: 10, clientY: 20 });
    expect(handlers.onAim).not.toHaveBeenCalled();
    expect(handlers.onFire).not.toHaveBeenCalled();
    expect(handlers.onSwap).not.toHaveBeenCalled();
  });

  it('suppresses the browser context menu on the canvas', () => {
    const event = new Event('contextmenu', { cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('stops responding after destroy', () => {
    input.destroy();
    dispatch(canvas, 'pointermove', { pointerType: 'mouse', clientX: 1, clientY: 1 });
    dispatch(canvas, 'pointerdown', { button: 0, clientX: 1, clientY: 1 });
    expect(handlers.onAim).not.toHaveBeenCalled();
    expect(handlers.onFire).not.toHaveBeenCalled();
  });
});
