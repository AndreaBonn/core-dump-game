import { describe, expect, it } from 'vitest';
import { isInsideBoard } from '@/engine/core/bounds';
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/config/constants';
import { vec2 } from '@/engine/math/vec2';

describe('isInsideBoard', () => {
  it('accepts a point in the middle of the board', () => {
    expect(isInsideBoard(vec2(BOARD_WIDTH / 2, BOARD_HEIGHT / 2), 0)).toBe(true);
  });

  it('accepts the exact corners', () => {
    expect(isInsideBoard(vec2(0, 0), 0)).toBe(true);
    expect(isInsideBoard(vec2(BOARD_WIDTH, BOARD_HEIGHT), 0)).toBe(true);
  });

  it('rejects a point past an edge when no margin is allowed', () => {
    expect(isInsideBoard(vec2(-1, 0), 0)).toBe(false);
    expect(isInsideBoard(vec2(0, -1), 0)).toBe(false);
    expect(isInsideBoard(vec2(BOARD_WIDTH + 1, 0), 0)).toBe(false);
    expect(isInsideBoard(vec2(0, BOARD_HEIGHT + 1), 0)).toBe(false);
  });

  it('allows overshoot up to the margin and no further', () => {
    expect(isInsideBoard(vec2(-32, 0), 32)).toBe(true);
    expect(isInsideBoard(vec2(-33, 0), 32)).toBe(false);
    expect(isInsideBoard(vec2(BOARD_WIDTH + 32, BOARD_HEIGHT + 32), 32)).toBe(true);
    expect(isInsideBoard(vec2(BOARD_WIDTH + 32, BOARD_HEIGHT + 33), 32)).toBe(false);
  });
});
