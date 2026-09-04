import { describe, expect, it } from 'vitest';
import { boardToScreen, fitViewport, screenToBoard, viewportBoxFor } from '@/engine/core/viewport';
import { BOARD_HEIGHT, BOARD_WIDTH, CONTENT_BOX, PACKET_RADIUS } from '@/config/constants';
import { vec2 } from '@/engine/math/vec2';

const FULL_BOARD = { x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT };

describe('viewportBoxFor', () => {
  it('fits the whole board on a landscape viewport', () => {
    expect(viewportBoxFor(1280, 800)).toEqual(FULL_BOARD);
  });

  it('fits the content box on a portrait viewport, where the board would not fit', () => {
    expect(viewportBoxFor(375, 700)).toEqual(CONTENT_BOX);
  });

  it('treats a square viewport as landscape', () => {
    expect(viewportBoxFor(600, 600)).toEqual(FULL_BOARD);
  });
});

describe('fitViewport', () => {
  it('reproduces the previous desktop transform exactly (no regression at 1280x800)', () => {
    const viewport = fitViewport(FULL_BOARD, 1280, 800);

    // Baseline captured from the shipped behaviour: scale min(1280/960, 800/600).
    expect(viewport.scale).toBeCloseTo(1280 / 960);
    expect(viewport.offsetX).toBeCloseTo(0);
    expect(viewport.offsetY).toBeCloseTo(0);
  });

  it('letterboxes a wider-than-board viewport by centring horizontally', () => {
    const viewport = fitViewport(FULL_BOARD, 1000, 500);

    expect(viewport.scale).toBeCloseTo(500 / 600);
    expect(viewport.offsetX).toBeCloseTo((1000 - BOARD_WIDTH * (500 / 600)) / 2);
    expect(viewport.offsetY).toBeCloseTo(0);
  });

  it('makes the game far bigger in portrait than fitting the whole board would', () => {
    const board = fitViewport(FULL_BOARD, 375, 700);
    const content = fitViewport(CONTENT_BOX, 375, 700);

    expect(board.scale).toBeCloseTo(375 / 960);
    expect(content.scale).toBeGreaterThan(board.scale * 1.5);
    // A packet must stay comfortably tappable: at least 18 CSS px across.
    expect(PACKET_RADIUS * 2 * content.scale).toBeGreaterThanOrEqual(18);
  });

  it('centres the chosen box on the viewport', () => {
    const viewport = fitViewport(CONTENT_BOX, 375, 700);
    const boxCentre = vec2(
      CONTENT_BOX.x + CONTENT_BOX.width / 2,
      CONTENT_BOX.y + CONTENT_BOX.height / 2,
    );

    const onScreen = boardToScreen(boxCentre, viewport);

    expect(onScreen.x).toBeCloseTo(375 / 2);
    expect(onScreen.y).toBeCloseTo(700 / 2);
  });
});

describe('screenToBoard', () => {
  it('is the exact inverse of boardToScreen in landscape', () => {
    const viewport = fitViewport(FULL_BOARD, 1280, 800);

    for (const point of [vec2(0, 0), vec2(480, 300), vec2(960, 600), vec2(123, 457)]) {
      const roundTrip = screenToBoard(boardToScreen(point, viewport), viewport);
      expect(roundTrip.x).toBeCloseTo(point.x, 6);
      expect(roundTrip.y).toBeCloseTo(point.y, 6);
    }
  });

  it('is the exact inverse of boardToScreen in portrait', () => {
    const viewport = fitViewport(CONTENT_BOX, 375, 700);

    for (const point of [vec2(194, 14), vec2(480, 300), vec2(766, 586), vec2(300, 200)]) {
      const roundTrip = screenToBoard(boardToScreen(point, viewport), viewport);
      expect(roundTrip.x).toBeCloseTo(point.x, 6);
      expect(roundTrip.y).toBeCloseTo(point.y, 6);
    }
  });
});
