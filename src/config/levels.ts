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
    chainLength: 20 + step * 4,
    colorCount: Math.min(4 + Math.floor(step / 2), 7),
    chainSpeed: 26 + step * 5,
    turns: 2.6 + step * 0.12,
    startRadius: 250 + (step % 2) * 20,
  };
}

function buildLevel(level: number): LevelConfig {
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
    seed: 1000 + level * 7919,
  };
}

export const LEVELS: readonly LevelConfig[] = Array.from({ length: TOTAL_LEVELS }, (_, index) =>
  buildLevel(index + 1),
);

/** Level config for a 1-based level number, clamped to the available range. */
export function getLevel(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(level, TOTAL_LEVELS));
  return LEVELS[clamped - 1]!;
}
