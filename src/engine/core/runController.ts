import {
  buildLevelConfig,
  CAMPAIGN_SEED_BASE,
  getLevel,
  TOTAL_LEVELS,
  type LevelConfig,
} from '@/config/levels';
import { dailySeed } from '@/engine/core/dailySeed';

export type RunMode = 'campaign' | 'endless' | 'daily';

/**
 * Resolve the config for a 1-based level index, or null when the run has no
 * further level (campaign completed). Endless and daily never return null.
 */
export type LevelProvider = (index: number) => LevelConfig | null;

/** Everything the engine needs to drive a run, independent of the game mode. */
export interface RunConfig {
  readonly mode: RunMode;
  readonly levelProvider: LevelProvider;
  /** 1-based level index the run starts from. */
  readonly startIndex: number;
  /** Last level of the run (win condition), or null for an endless run. */
  readonly finalLevel: number | null;
}

/**
 * Whether clearing `level` ends the run in victory. Only a mode with a final
 * level can be won: endless and daily have none, so they end on game over.
 */
export function isRunWon(level: number, finalLevel: number | null): boolean {
  return finalLevel !== null && level >= finalLevel;
}

/** Campaign: the fixed TOTAL_LEVELS sequence; past the last level the run is won. */
export function campaignConfig(): RunConfig {
  return {
    mode: 'campaign',
    levelProvider: (index) => (index <= TOTAL_LEVELS ? getLevel(index) : null),
    startIndex: 1,
    finalLevel: TOTAL_LEVELS,
  };
}

/**
 * Endless: an unbounded sequence extrapolated past the campaign. Pass a `seed`
 * to vary the layout between runs; omit it for a reproducible sequence (tests).
 */
export function endlessConfig(seed: number = CAMPAIGN_SEED_BASE): RunConfig {
  return {
    mode: 'endless',
    levelProvider: (index) => buildLevelConfig(index, seed),
    startIndex: 1,
    finalLevel: null,
  };
}

/**
 * Daily: an unbounded run whose layout is fixed by the calendar date, so every
 * player sharing that date plays the same sequence.
 */
export function dailyConfig(date: Date): RunConfig {
  const seed = dailySeed(date);
  return {
    mode: 'daily',
    levelProvider: (index) => buildLevelConfig(index, seed),
    startIndex: 1,
    finalLevel: null,
  };
}

/** Largest 32-bit signed integer, the upper bound for a random endless seed. */
const MAX_SEED = 0x7fffffff;

/**
 * Build the RunConfig for a mode chosen in the UI. Endless gets a fresh random
 * seed each run for variety; daily is anchored to today's local date. The seed
 * still flows through the deterministic PRNG, so the simulation stays
 * reproducible for a given config.
 */
export function runConfigForMode(mode: RunMode): RunConfig {
  switch (mode) {
    case 'endless':
      return endlessConfig(Math.floor(Math.random() * MAX_SEED));
    case 'daily':
      return dailyConfig(new Date());
    default:
      return campaignConfig();
  }
}
