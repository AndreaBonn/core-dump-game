import { BOARD_HEIGHT, BOARD_WIDTH, CONTENT_BOX } from '@/config/constants';
import { vec2, type Vec2 } from '@/engine/math/vec2';

/** A rectangle of the board, in board coordinates. */
export interface BoardBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The mapping from board coordinates to CSS pixels for one canvas size. */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const FULL_BOARD: BoardBox = { x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT };

/**
 * Which part of the board to fit on screen. Landscape viewports get the whole
 * board; portrait ones get the square the game occupies, because fitting a
 * 960x600 board into a tall narrow screen is limited by the width and leaves
 * the packets too small to aim at with a finger.
 */
export function viewportBoxFor(cssWidth: number, cssHeight: number): BoardBox {
  return cssHeight > cssWidth ? CONTENT_BOX : FULL_BOARD;
}

/**
 * Fit `box` inside the canvas, centred, preserving the aspect ratio. The offset
 * is written as "centre the box, then shift by its origin" rather than the
 * equivalent `cssWidth / 2 - centre * scale`: for a box at the origin the two
 * differ by a floating-point rounding step, and this form reproduces the
 * transform the game shipped with, bit for bit.
 */
export function fitViewport(box: BoardBox, cssWidth: number, cssHeight: number): Viewport {
  const scale = Math.min(cssWidth / box.width, cssHeight / box.height);
  return {
    scale,
    offsetX: (cssWidth - box.width * scale) / 2 - box.x * scale,
    offsetY: (cssHeight - box.height * scale) / 2 - box.y * scale,
  };
}

/** Board coordinates to CSS pixels relative to the canvas origin. */
export function boardToScreen(point: Vec2, viewport: Viewport): Vec2 {
  return vec2(
    point.x * viewport.scale + viewport.offsetX,
    point.y * viewport.scale + viewport.offsetY,
  );
}

/** CSS pixels relative to the canvas origin back to board coordinates. */
export function screenToBoard(point: Vec2, viewport: Viewport): Vec2 {
  return vec2(
    (point.x - viewport.offsetX) / viewport.scale,
    (point.y - viewport.offsetY) / viewport.scale,
  );
}
