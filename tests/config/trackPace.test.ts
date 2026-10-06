import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/config/campaign';
import {
  buildLevelConfig,
  LEVELS,
  levelTrack,
  MAX_CHAIN_SPEED,
  type LevelConfig,
} from '@/config/levels';
import { sampleCatmullRom } from '@/engine/math/spline';
import type { Vec2 } from '@/engine/math/vec2';

const SPECS = CHAPTERS.flatMap(({ levels }) => levels);
const ENDLESS_SEED = 4242;
const ENDLESS_LEVELS = Array.from({ length: 30 }, (_, index) => index + 31);
const DEEP_ENDLESS_LEVELS = Array.from({ length: 40 }, (_, index) => index + 40);
// One endless step adds 5 to the speed and moves the track to another radius
// variant: neighbouring spirals cross within this share of each other.
const NEIGHBOUR_TOLERANCE = 0.25;
const DIGITS = 6;

function crossingSeconds(track: readonly Vec2[], speed: number): number {
  return sampleCatmullRom(track).totalLength / speed;
}

const crossing = (config: LevelConfig): number =>
  crossingSeconds(config.waypoints, config.chainSpeed);

describe('track pace', () => {
  it.each(LEVELS.map((config, index) => [config.level, config, SPECS[index]!] as const))(
    'campaign level %i crosses its track in the time of its spiral',
    (level, config, spec) => {
      const spiral = crossingSeconds(levelTrack(level, spec.turns, 'spiral'), spec.chainSpeed);

      expect(crossing(config)).toBeCloseTo(spiral, DIGITS);
    },
  );

  it('keeps a spiral level at the speed its chapter sets', () => {
    const spirals = LEVELS.filter(({ pathKind }) => pathKind === 'spiral');

    expect(spirals.length).toBeGreaterThan(0);
    for (const config of spirals) {
      expect(config.chainSpeed).toBe(SPECS[config.level - 1]!.chainSpeed);
    }
  });

  it('never lets an endless serpentine or loop cross faster than the spirals beside it', () => {
    const configs = ENDLESS_LEVELS.map((level) => buildLevelConfig(level, ENDLESS_SEED));
    const spiralTimes = configs.filter(({ pathKind }) => pathKind === 'spiral').map(crossing);
    const low = Math.min(...spiralTimes) * (1 - NEIGHBOUR_TOLERANCE);

    for (const config of configs.filter(({ pathKind }) => pathKind !== 'spiral')) {
      expect(crossing(config), `level ${config.level} ${config.pathKind}`).toBeGreaterThan(low);
    }
  });

  // Past the cap a longer track keeps the capped speed and so gives more time:
  // the cap is what keeps deep endless levels playable.
  it('keeps every track shape at or below the speed cap deep into endless', () => {
    const configs = DEEP_ENDLESS_LEVELS.map((level) => buildLevelConfig(level, ENDLESS_SEED));

    expect(new Set(configs.map(({ pathKind }) => pathKind)).size).toBeGreaterThan(1);
    for (const config of configs) {
      expect(config.chainSpeed, `level ${config.level} ${config.pathKind}`).toBeLessThanOrEqual(
        MAX_CHAIN_SPEED,
      );
    }
  });
});
