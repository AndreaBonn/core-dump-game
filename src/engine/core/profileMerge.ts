import type { CampaignProgress } from '@/engine/core/progress';
import type { ScoreMode } from '@/engine/core/runController';
import type { Stars } from '@/engine/core/stars';
import type { PlayerStats } from '@/engine/core/stats';

/** Everything the game saves about a player. */
export interface SavedProfile {
  progress: CampaignProgress;
  stats: PlayerStats;
  earned: string[];
  /** When the player last reset the profile, ms since epoch; 0 if never. */
  resetAt: number;
}

function maxByMode(
  a: Readonly<Record<ScoreMode, number>>,
  b: Readonly<Record<ScoreMode, number>>,
): Record<ScoreMode, number> {
  const result = { ...a };
  for (const mode of Object.keys(b) as ScoreMode[]) {
    result[mode] = Math.max(a[mode], b[mode]);
  }
  return result;
}

function maxStars(
  a: Readonly<Record<number, Stars>>,
  b: Readonly<Record<number, Stars>>,
): Record<number, Stars> {
  const result: Record<number, Stars> = { ...a };
  for (const [key, stars] of Object.entries(b)) {
    const level = Number(key);
    result[level] = Math.max(a[level] ?? 0, stars) as Stars;
  }
  return result;
}

/**
 * Combine two saves of the same player, keeping the better value field by
 * field. Counters take the larger one rather than the sum: both saves usually
 * share most of their history, and adding them would count it twice.
 *
 * A reset is the exception: when the two saves come from different resets, the
 * newer one wins whole. A field-wise max would otherwise let any stale copy (an
 * old browser, a save read before the reset) bring the erased profile back.
 */
export function mergeProfiles(a: SavedProfile, b: SavedProfile): SavedProfile {
  if (a.resetAt !== b.resetAt) {
    return a.resetAt > b.resetAt ? a : b;
  }
  return {
    progress: {
      stars: maxStars(a.progress.stars, b.progress.stars),
      unlockedThrough: Math.max(a.progress.unlockedThrough, b.progress.unlockedThrough),
    },
    stats: {
      runsPlayed: Math.max(a.stats.runsPlayed, b.stats.runsPlayed),
      runsWon: Math.max(a.stats.runsWon, b.stats.runsWon),
      levelsCleared: Math.max(a.stats.levelsCleared, b.stats.levelsCleared),
      powerUpsTriggered: Math.max(a.stats.powerUpsTriggered, b.stats.powerUpsTriggered),
      bestCombo: Math.max(a.stats.bestCombo, b.stats.bestCombo),
      bestScore: maxByMode(a.stats.bestScore, b.stats.bestScore),
      bestLevel: maxByMode(a.stats.bestLevel, b.stats.bestLevel),
    },
    earned: [...new Set([...a.earned, ...b.earned])],
    resetAt: a.resetAt,
  };
}
