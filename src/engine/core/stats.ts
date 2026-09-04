import { isScoredMode, type ScoreMode } from '@/engine/core/runController';
import type { RunResult } from '@/types/game.types';

/** Everything the profile screen shows, accumulated across every run. */
export interface PlayerStats {
  readonly runsPlayed: number;
  readonly runsWon: number;
  readonly levelsCleared: number;
  readonly powerUpsTriggered: number;
  /** Largest number of chained explosions in a single shot. */
  readonly bestCombo: number;
  readonly bestScore: Readonly<Record<ScoreMode, number>>;
  readonly bestLevel: Readonly<Record<ScoreMode, number>>;
}

export const EMPTY_STATS: PlayerStats = {
  runsPlayed: 0,
  runsWon: 0,
  levelsCleared: 0,
  powerUpsTriggered: 0,
  bestCombo: 0,
  bestScore: { campaign: 0, endless: 0, daily: 0 },
  bestLevel: { campaign: 0, endless: 0, daily: 0 },
};

/**
 * Fold a finished run into the stats. Every reducer here returns a new value
 * and never touches the one it was given, so the store can hold the result
 * without the caller having to know when a copy was made.
 */
export function recordRun(stats: PlayerStats, result: RunResult): PlayerStats {
  // The tutorial is not a run: counting it would put a teaching level in the
  // records and skew every average on the profile screen.
  if (!isScoredMode(result.mode)) {
    return stats;
  }
  return {
    ...stats,
    runsPlayed: stats.runsPlayed + 1,
    runsWon: stats.runsWon + (result.won ? 1 : 0),
    bestScore: {
      ...stats.bestScore,
      [result.mode]: Math.max(stats.bestScore[result.mode], result.score),
    },
    bestLevel: {
      ...stats.bestLevel,
      [result.mode]: Math.max(stats.bestLevel[result.mode], result.levelReached),
    },
  };
}

/** A cleared level, counted whether or not the run went on to end well. */
export function recordLevelCleared(stats: PlayerStats): PlayerStats {
  return { ...stats, levelsCleared: stats.levelsCleared + 1 };
}

export function recordPowerUp(stats: PlayerStats): PlayerStats {
  return { ...stats, powerUpsTriggered: stats.powerUpsTriggered + 1 };
}

/** Keep the largest combo ever chained; smaller ones leave the stats alone. */
export function recordCombo(stats: PlayerStats, multiplier: number): PlayerStats {
  if (multiplier <= stats.bestCombo) {
    return stats;
  }
  return { ...stats, bestCombo: multiplier };
}
