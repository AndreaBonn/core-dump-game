import { getLevel } from '@/config/levels';
import { recordLevel, type CampaignProgress } from '@/engine/core/progress';
import { starsFor } from '@/engine/core/stars';
import { recordLevelCleared, type PlayerStats } from '@/engine/core/stats';

/**
 * A cleared campaign level: its star rating and the cleared-level counter, in
 * one step. Shared by the level-complete path and by a campaign win, whose
 * final level never reaches the level-complete event.
 */
export function recordCampaignLevel(
  progress: CampaignProgress,
  stats: PlayerStats,
  level: number,
  levelScore: number,
): { progress: CampaignProgress; stats: PlayerStats } {
  const stars = starsFor(levelScore, getLevel(level).starThresholds);
  return {
    progress: recordLevel(progress, level, stars),
    stats: recordLevelCleared(stats),
  };
}
