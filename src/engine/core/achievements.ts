import { TOTAL_LEVELS } from '@/config/levels';
import { isCampaignPerfect, totalStars, type CampaignProgress } from '@/engine/core/progress';
import type { PlayerStats } from '@/engine/core/stats';

/** Everything an achievement may look at to decide whether it is earned. */
export interface AchievementState {
  readonly stats: PlayerStats;
  readonly progress: CampaignProgress;
}

export type AchievementId =
  | 'hello-world'
  | 'first-commit'
  | 'segfault'
  | 'stack-overflow'
  | 'kernel-panic'
  | 'sudo'
  | 'garbage-collector'
  | 'halfway'
  | 'root-access'
  | 'three-stars'
  | 'twenty-stars'
  | 'all-stars'
  | 'uptime'
  | 'daemon'
  | 'memory-leak'
  | 'no-oom'
  | 'cron'
  | 'five-figures';

/** Campaign level the "halfway" achievement asks for. */
export const HALFWAY_LEVEL = Math.ceil(TOTAL_LEVELS / 2);

/**
 * Name and description are not here: they are display text and live in the
 * dictionaries under `achievements.items.<id>`.
 */
export interface Achievement {
  readonly id: AchievementId;
  readonly isEarned: (state: AchievementState) => boolean;
}

/**
 * The catalogue. Every entry is a pure predicate over accumulated stats and
 * campaign progress, so unlocking is replayable: re-evaluating the same state
 * always yields the same set, and nothing depends on the order events arrived.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'hello-world',
    isEarned: ({ stats }) => stats.runsPlayed >= 1,
  },
  {
    id: 'first-commit',
    isEarned: ({ stats }) => stats.levelsCleared >= 1,
  },
  {
    id: 'segfault',
    isEarned: ({ stats }) => stats.bestCombo >= 2,
  },
  {
    id: 'stack-overflow',
    isEarned: ({ stats }) => stats.bestCombo >= 3,
  },
  {
    id: 'kernel-panic',
    isEarned: ({ stats }) => stats.bestCombo >= 4,
  },
  {
    id: 'sudo',
    isEarned: ({ stats }) => stats.powerUpsTriggered >= 1,
  },
  {
    id: 'garbage-collector',
    isEarned: ({ stats }) => stats.powerUpsTriggered >= 50,
  },
  {
    id: 'halfway',
    isEarned: ({ stats }) => stats.bestLevel.campaign >= HALFWAY_LEVEL,
  },
  {
    id: 'root-access',
    isEarned: ({ stats }) => stats.runsWon >= 1,
  },
  {
    id: 'three-stars',
    isEarned: ({ progress }) => Object.values(progress.stars).some((stars) => stars === 3),
  },
  {
    id: 'twenty-stars',
    isEarned: ({ progress }) => totalStars(progress) >= 20,
  },
  {
    id: 'all-stars',
    isEarned: ({ progress }) => isCampaignPerfect(progress),
  },
  {
    id: 'uptime',
    isEarned: ({ stats }) => stats.runsPlayed >= 10,
  },
  {
    id: 'daemon',
    isEarned: ({ stats }) => stats.runsPlayed >= 50,
  },
  {
    id: 'memory-leak',
    isEarned: ({ stats }) => stats.bestLevel.endless >= 15,
  },
  {
    id: 'no-oom',
    isEarned: ({ stats }) => stats.bestLevel.endless >= 25,
  },
  {
    id: 'cron',
    isEarned: ({ stats }) => stats.bestLevel.daily >= 1,
  },
  {
    id: 'five-figures',
    isEarned: ({ stats }) =>
      Math.max(stats.bestScore.campaign, stats.bestScore.endless, stats.bestScore.daily) >= 10_000,
  },
];

/** Ids of every achievement the state satisfies, earned before or not. */
export function evaluate(state: AchievementState): string[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.isEarned(state)).map(({ id }) => id);
}

/** Ids earned by this state that were not earned already, for the toast. */
export function newlyEarned(state: AchievementState, alreadyEarned: readonly string[]): string[] {
  const known = new Set(alreadyEarned);
  return evaluate(state).filter((id) => !known.has(id));
}

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
