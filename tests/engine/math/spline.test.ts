import { describe, expect, it } from 'vitest';
import { pointAtDistance, sampleCatmullRom, tangentAtDistance } from '@/engine/math/spline';
import { vec2 } from '@/engine/math/vec2';

describe('sampleCatmullRom', () => {
  it('throws when given fewer than two waypoints', () => {
    expect(() => sampleCatmullRom([vec2(0, 0)])).toThrow();
  });

  it('passes through the first and last waypoint', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(100, 0)]);
    expect(pointAtDistance(curve, 0)).toEqual({ x: 0, y: 0 });
    const end = pointAtDistance(curve, curve.totalLength);
    expect(end.x).toBeCloseTo(100);
    expect(end.y).toBeCloseTo(0);
  });

  it('measures total length of a straight horizontal segment', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(100, 0)]);
    expect(curve.totalLength).toBeCloseTo(100, 5);
  });

  it('maps distance to a point at uniform speed on a straight line', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(200, 0)]);
    const mid = pointAtDistance(curve, 100);
    expect(mid.x).toBeCloseTo(100, 3);
    expect(mid.y).toBeCloseTo(0, 3);
  });

  it('clamps distance beyond the curve to the endpoints', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(100, 0)]);
    expect(pointAtDistance(curve, -50)).toEqual({ x: 0, y: 0 });
    const past = pointAtDistance(curve, 999);
    expect(past.x).toBeCloseTo(100);
  });

  it('reports a tangent pointing in the direction of travel', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(100, 0)]);
    const tangent = tangentAtDistance(curve, 50);
    expect(tangent.x).toBeCloseTo(1, 3);
    expect(tangent.y).toBeCloseTo(0, 3);
  });

  it('produces a longer arc length for a curved path than the chord', () => {
    const curve = sampleCatmullRom([vec2(0, 0), vec2(50, 80), vec2(100, 0)]);
    const chord = 2 * Math.hypot(50, 80);
    expect(curve.totalLength).toBeGreaterThan(chord);
  });
});
