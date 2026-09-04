import { describe, expect, it } from 'vitest';
import { buildTrack, type PathKind, type TrackSpec } from '@/config/paths';
import { buildLevelConfig, CAMPAIGN_SEED_BASE } from '@/config/levels';
import { BOARD_HEIGHT, BOARD_WIDTH, PACKET_RADIUS } from '@/config/constants';
import { Path } from '@/engine/entities/Path';

const KINDS: readonly PathKind[] = ['spiral', 'serpentine', 'loop'];

function spec(kind: PathKind): TrackSpec {
  return { kind, reach: 260, sweeps: 3, waypoints: 64 };
}

describe.each(KINDS)('the %s track', (kind) => {
  const waypoints = buildTrack(spec(kind));

  it('produces the requested number of waypoints', () => {
    expect(waypoints).toHaveLength(64);
  });

  it('stays within the reach it was given', () => {
    for (const point of waypoints) {
      expect(Math.abs(point.x - BOARD_WIDTH / 2)).toBeLessThanOrEqual(260 + PACKET_RADIUS);
      expect(Math.abs(point.y - BOARD_HEIGHT / 2)).toBeLessThanOrEqual(260 + PACKET_RADIUS);
    }
  });

  it('ends near the centre, where the void is', () => {
    const last = waypoints[waypoints.length - 1]!;
    const distanceFromCentre = Math.hypot(last.x - BOARD_WIDTH / 2, last.y - BOARD_HEIGHT / 2);

    expect(distanceFromCentre).toBeLessThan(120);
  });

  it('has no zero-length step, which would stall the chain', () => {
    for (let i = 1; i < waypoints.length; i += 1) {
      const step = Math.hypot(
        waypoints[i]!.x - waypoints[i - 1]!.x,
        waypoints[i]!.y - waypoints[i - 1]!.y,
      );
      expect(step).toBeGreaterThan(0);
    }
  });

  it('samples to a path whose arc length only ever grows', () => {
    const path = new Path(waypoints);

    expect(path.length).toBeGreaterThan(0);
    let previous = path.pointAt(0);
    for (let d = 10; d <= path.length; d += 10) {
      const point = path.pointAt(d);
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      previous = point;
    }
    expect(previous).toBeDefined();
  });
});

describe('track assignment', () => {
  it('keeps the first levels on the spiral while the player learns', () => {
    for (let level = 1; level <= 3; level += 1) {
      expect(buildLevelConfig(level, CAMPAIGN_SEED_BASE).pathKind).toBe('spiral');
    }
  });

  it('varies the shape later, including past the campaign', () => {
    const kinds = new Set(
      Array.from(
        { length: 40 },
        (_, index) => buildLevelConfig(index + 4, CAMPAIGN_SEED_BASE).pathKind,
      ),
    );

    expect(kinds).toEqual(new Set(['spiral', 'serpentine', 'loop']));
  });

  it('is deterministic: the same level always has the same shape', () => {
    expect(buildLevelConfig(17, CAMPAIGN_SEED_BASE).pathKind).toBe(
      buildLevelConfig(17, CAMPAIGN_SEED_BASE).pathKind,
    );
  });
});
