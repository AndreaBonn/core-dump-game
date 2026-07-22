import { buildSpiral } from '@/config/paths';
import type { Vec2 } from '@/engine/math/vec2';

export interface LevelConfig {
  readonly level: number;
  readonly waypoints: readonly Vec2[];
  /** Total number of packets in the chain for this level. */
  readonly chainLength: number;
  /** How many distinct packet colours are in play. */
  readonly colorCount: number;
  /** Chain advance speed in pixels per second. */
  readonly chainSpeed: number;
  /** Probability that a generated packet is a power-up. */
  readonly powerUpChance: number;
  /** Deterministic seed for chain generation. */
  readonly seed: number;
}

export const TOTAL_LEVELS = 10;

const POWER_UP_CHANCE = 0.05;

/** Seed base of the campaign; keeps campaign layouts identical across runs. */
export const CAMPAIGN_SEED_BASE = 1000;

/** Prime step folded into the per-level seed so adjacent levels differ. */
const SEED_STEP = 7919;

// Difficulty caps so endless levels past the campaign stay playable rather than
// scaling without bound. Set high enough not to affect the first TOTAL_LEVELS.
const MAX_CHAIN_LENGTH = 160;
const MAX_CHAIN_SPEED = 220;
const MAX_TURNS = 6;

interface LevelTuning {
  chainLength: number;
  colorCount: number;
  chainSpeed: number;
  turns: number;
  startRadius: number;
}

function tuningForLevel(level: number): LevelTuning {
  const step = level - 1;
  return {
    chainLength: Math.min(20 + step * 4, MAX_CHAIN_LENGTH),
    colorCount: Math.min(4 + Math.floor(step / 2), 7),
    chainSpeed: Math.min(26 + step * 5, MAX_CHAIN_SPEED),
    turns: Math.min(2.6 + step * 0.12, MAX_TURNS),
    startRadius: 250 + (step % 2) * 20,
  };
}

/**
 * Build a level config for any 1-based `level`, seeding chain generation from
 * `seedBase`. The campaign uses CAMPAIGN_SEED_BASE (stable layouts); endless and
 * daily runs pass their own base to vary or reproduce the sequence. Works past
 * TOTAL_LEVELS: tuning extrapolates and is capped so it stays playable.
 */
export function buildLevelConfig(level: number, seedBase: number): LevelConfig {
  const tuning = tuningForLevel(level);
  const waypoints: readonly Vec2[] = buildSpiral({
    turns: tuning.turns,
    startRadius: tuning.startRadius,
    endRadius: 54,
    waypoints: 64,
  });
  return {
    level,
    waypoints,
    chainLength: tuning.chainLength,
    colorCount: tuning.colorCount,
    chainSpeed: tuning.chainSpeed,
    powerUpChance: POWER_UP_CHANCE,
    seed: seedBase + level * SEED_STEP,
  };
}

export const LEVELS: readonly LevelConfig[] = Array.from({ length: TOTAL_LEVELS }, (_, index) =>
  buildLevelConfig(index + 1, CAMPAIGN_SEED_BASE),
);

/** Level config for a 1-based level number, clamped to the available range. */
export function getLevel(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(level, TOTAL_LEVELS));
  return LEVELS[clamped - 1]!;
}
