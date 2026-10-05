import { describe, expect, it } from 'vitest';
import { buildLevelConfig, CAMPAIGN_SEED_BASE, type LevelConfig } from '@/config/levels';
import { dailySeed } from '@/engine/core/dailySeed';
import { buildLevelState } from '@/engine/core/levelBuilder';
import golden from './__fixtures__/levels-golden.json';

const FIXED_SEED = 123456789;
const LEVEL_COUNT = 50;
const WAYPOINT_PRECISION = 1000;
const SEEDS = [CAMPAIGN_SEED_BASE, FIXED_SEED, dailySeed(new Date(2026, 0, 15))];

type GoldenConfig = Pick<LevelConfig, keyof (typeof golden)[number]['config']>;

function captureConfig(config: LevelConfig): GoldenConfig {
  const {
    chainLength,
    colorCount,
    chainSpeed,
    powerUpChance,
    hazardChance,
    pathKind,
    seed,
    starThresholds,
  } = config;
  return {
    chainLength,
    colorCount,
    chainSpeed,
    powerUpChance,
    hazardChance,
    pathKind,
    seed,
    starThresholds,
    waypoints: config.waypoints.map(({ x, y }) => ({
      x: Math.round(x * WAYPOINT_PRECISION) / WAYPOINT_PRECISION,
      y: Math.round(y * WAYPOINT_PRECISION) / WAYPOINT_PRECISION,
    })),
  };
}

describe('level golden fixtures', () => {
  it('covers levels 1 to 50 for campaign, fixed and daily seeds', () => {
    const combinations = SEEDS.flatMap((seedBase) =>
      Array.from({ length: LEVEL_COUNT }, (_, index) => ({ level: index + 1, seedBase })),
    );
    expect(golden.map(({ level, seedBase }) => ({ level, seedBase }))).toEqual(combinations);
  });

  it.each(golden)('preserves level $level with seed base $seedBase', (entry) => {
    const config = buildLevelConfig(entry.level, entry.seedBase);
    const state = buildLevelState(config);
    const packets = state.chain.packets.map(({ type, matchable, powerUpType, distance }) => ({
      type,
      matchable,
      powerUpType,
      distance,
    }));

    expect({
      config: captureConfig(config),
      packets,
      cursor: { currentType: state.cursor.currentType, nextType: state.cursor.nextType },
    }).toEqual({ config: entry.config, packets: entry.packets, cursor: entry.cursor });
  });
});
