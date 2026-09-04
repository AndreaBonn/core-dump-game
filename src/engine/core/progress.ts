import { TOTAL_LEVELS } from '@/config/levels';
import type { Stars } from '@/engine/core/stars';

/** Campaign progress: how far the player got and how well they did. */
export interface CampaignProgress {
  /** Stars per 1-based campaign level; a level absent here was never cleared. */
  readonly stars: Readonly<Record<number, Stars>>;
  /** Highest level the player may start from, 1-based. */
  readonly unlockedThrough: number;
}

export const EMPTY_PROGRESS: CampaignProgress = { stars: {}, unlockedThrough: 1 };

/**
 * Record the result of a campaign level. Stars only ever go up: replaying a
 * level for a better score can improve the rating, never take it away. The next
 * level unlocks as soon as this one is cleared at all.
 */
export function recordLevel(
  progress: CampaignProgress,
  level: number,
  stars: Stars,
): CampaignProgress {
  if (level < 1 || level > TOTAL_LEVELS) {
    return progress;
  }
  const best = Math.max(progress.stars[level] ?? 0, stars) as Stars;
  return {
    stars: { ...progress.stars, [level]: best },
    unlockedThrough: Math.max(progress.unlockedThrough, Math.min(level + 1, TOTAL_LEVELS)),
  };
}

export function starsOf(progress: CampaignProgress, level: number): Stars {
  return progress.stars[level] ?? 0;
}

export function totalStars(progress: CampaignProgress): number {
  return Object.values(progress.stars).reduce<number>((sum, stars) => sum + stars, 0);
}

/** True when every campaign level has been cleared with three stars. */
export function isCampaignPerfect(progress: CampaignProgress): boolean {
  return totalStars(progress) === TOTAL_LEVELS * 3;
}

export function isLevelUnlocked(progress: CampaignProgress, level: number): boolean {
  return level <= progress.unlockedThrough;
}
