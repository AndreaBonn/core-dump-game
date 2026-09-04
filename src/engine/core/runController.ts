import {
  buildLevelConfig,
  CAMPAIGN_SEED_BASE,
  getLevel,
  TOTAL_LEVELS,
  type LevelConfig,
} from '@/config/levels';
import { dailySeed } from '@/engine/core/dailySeed';

/** Modes whose scores belong on a leaderboard and in the statistics. */
export type ScoreMode = 'campaign' | 'endless' | 'daily';

/** Every mode the engine can run, including the one that only teaches. */
export type RunMode = ScoreMode | 'tutorial';

/** Whether a run in this mode counts towards records and statistics. */
export function isScoredMode(mode: RunMode): mode is ScoreMode {
  return mode !== 'tutorial';
}

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

/**
 * Campaign: the fixed TOTAL_LEVELS sequence; past the last level the run is
 * won. `startIndex` lets the level select drop the player straight into a level
 * they have already unlocked; the run still ends at the final level.
 */
export function campaignConfig(startIndex = 1): RunConfig {
  return {
    mode: 'campaign',
    levelProvider: (index) => (index <= TOTAL_LEVELS ? getLevel(index) : null),
    startIndex: Math.max(1, Math.min(startIndex, TOTAL_LEVELS)),
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

/**
 * Tutorial: a single short, slow level with few colours and no power-ups or
 * hazards, so the overlay can teach one thing at a time. Clearing it ends the
 * run as a win, which is what closes the overlay.
 */
export function tutorialConfig(): RunConfig {
  const base = buildLevelConfig(1, CAMPAIGN_SEED_BASE);
  const level: LevelConfig = {
    ...base,
    chainLength: 12,
    colorCount: 3,
    chainSpeed: 16,
    powerUpChance: 0,
    hazardChance: 0,
  };
  return {
    mode: 'tutorial',
    levelProvider: (index) => (index === 1 ? level : null),
    startIndex: 1,
    finalLevel: 1,
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
export function runConfigForMode(mode: RunMode, startIndex = 1): RunConfig {
  switch (mode) {
    case 'tutorial':
      return tutorialConfig();
    case 'endless':
      return endlessConfig(Math.floor(Math.random() * MAX_SEED));
    case 'daily':
      return dailyConfig(new Date());
    default:
      return campaignConfig(startIndex);
  }
}
