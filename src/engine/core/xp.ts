import { LEVELS } from '@/config/levels';
import { totalStars, type CampaignProgress } from '@/engine/core/progress';
import type { PlayerStats } from '@/engine/core/stats';

// Never lower these weights: derived XP would retroactively demote existing players.
const XP_PER_LEVEL_CLEARED = 100;
const XP_PER_STAR = 50;
const XP_PER_BOSS_CLEARED = 300;
const XP_PER_ACHIEVEMENT = 75;
const BOSS_CLEAR_STARS = 1;
const CAMPAIGN_BOSSES = LEVELS.filter(({ isBoss }) => isBoss);

/** Count campaign bosses cleared with at least one star, once per boss. */
export function bossesCleared(progress: CampaignProgress): number {
  return CAMPAIGN_BOSSES.filter(({ level }) => (progress.stars[level] ?? 0) >= BOSS_CLEAR_STARS)
    .length;
}

/** Return total XP derived from saved stats, campaign stars and unique earned achievements. */
export function xpFor(state: {
  stats: PlayerStats;
  progress: CampaignProgress;
  earned: readonly string[];
}): number {
  const { stats, progress, earned } = state;
  return (
    XP_PER_LEVEL_CLEARED * stats.levelsCleared +
    XP_PER_STAR * totalStars(progress) +
    XP_PER_BOSS_CLEARED * bossesCleared(progress) +
    XP_PER_ACHIEVEMENT * new Set(earned).size
  );
}
