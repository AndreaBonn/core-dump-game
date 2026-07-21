import { describe, expect, it } from 'vitest';
import {
  add,
  angleOf,
  distance,
  length,
  lerp,
  normalize,
  scale,
  subtract,
  vec2,
} from '@/engine/math/vec2';

describe('vec2', () => {
  it('adds two vectors component-wise', () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
  });

  it('subtracts two vectors component-wise', () => {
    expect(subtract(vec2(5, 5), vec2(2, 1))).toEqual({ x: 3, y: 4 });
  });

  it('scales a vector by a factor', () => {
    expect(scale(vec2(2, -3), 2)).toEqual({ x: 4, y: -6 });
  });

  it('computes euclidean length', () => {
    expect(length(vec2(3, 4))).toBe(5);
  });

  it('computes distance between two points', () => {
    expect(distance(vec2(0, 0), vec2(3, 4))).toBe(5);
  });

  it('normalizes to unit length', () => {
    const n = normalize(vec2(0, 10));
    expect(n).toEqual({ x: 0, y: 1 });
  });

  it('returns zero vector when normalizing the zero vector', () => {
    expect(normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it('computes the angle from the positive x-axis', () => {
    expect(angleOf(vec2(1, 0))).toBe(0);
    expect(angleOf(vec2(0, 1))).toBeCloseTo(Math.PI / 2);
  });

  it('interpolates linearly and clamps t to [0, 1]', () => {
    expect(lerp(vec2(0, 0), vec2(10, 20), 0.5)).toEqual({ x: 5, y: 10 });
    expect(lerp(vec2(0, 0), vec2(10, 20), -1)).toEqual({ x: 0, y: 0 });
    expect(lerp(vec2(0, 0), vec2(10, 20), 2)).toEqual({ x: 10, y: 20 });
  });
});
