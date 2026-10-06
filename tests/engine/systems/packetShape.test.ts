import { describe, expect, it } from 'vitest';
import { diamondVertices, hexVertices } from '@/engine/systems/packetShape';

describe('packet shape geometry', () => {
  it('places a flat-top hexagon clockwise on canvas from the rightmost vertex', () => {
    const vertices = hexVertices({ x: 0, y: 0 }, 10);
    const expected = [
      { x: 10, y: 0 },
      { x: 5, y: 8.660254037844386 },
      { x: -5, y: 8.660254037844386 },
      { x: -10, y: 0 },
      { x: -5, y: -8.660254037844386 },
      { x: 5, y: -8.660254037844386 },
    ];
    expect(vertices).toHaveLength(6);
    vertices.forEach((vertex, index) => {
      expect(vertex.x).toBeCloseTo(expected[index]!.x);
      expect(vertex.y).toBeCloseTo(expected[index]!.y);
    });
  });

  it('places the diamond points at the four cardinal directions, starting at the top', () => {
    expect(diamondVertices({ x: 0, y: 0 }, 10)).toEqual([
      { x: 0, y: -10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: -10, y: 0 },
    ]);
  });

  it.each([
    ['hex', hexVertices, 6],
    ['diamond', diamondVertices, 4],
  ] as const)('keeps %s vertices on the translated circumcircle', (_, verticesFor, count) => {
    const center = { x: 31, y: -17 };
    const vertices = verticesFor(center, 7);
    expect(vertices).toHaveLength(count);
    for (const vertex of vertices) {
      expect(Math.hypot(vertex.x - center.x, vertex.y - center.y)).toBeCloseTo(7);
    }
    expect(verticesFor(center, 0)).toEqual(Array.from({ length: count }, () => center));
  });
});
