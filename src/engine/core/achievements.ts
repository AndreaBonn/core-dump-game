import { TOTAL_LEVELS } from '@/config/levels';
import { isCampaignPerfect, totalStars, type CampaignProgress } from '@/engine/core/progress';
import type { PlayerStats } from '@/engine/core/stats';

/** Everything an achievement may look at to decide whether it is earned. */
export interface AchievementState {
  readonly stats: PlayerStats;
  readonly progress: CampaignProgress;
}

export interface Achievement {
  readonly id: string;
  /** Terminal-flavoured name, shown in the grid. */
  readonly name: string;
  /** What the player did, in plain words. */
  readonly description: string;
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
    name: 'hello, world',
    description: 'Finish your first run.',
    isEarned: ({ stats }) => stats.runsPlayed >= 1,
  },
  {
    id: 'first-commit',
    name: 'first commit',
    description: 'Clear your first level.',
    isEarned: ({ stats }) => stats.levelsCleared >= 1,
  },
  {
    id: 'segfault',
    name: 'SEGFAULT',
    description: 'Chain two explosions in one shot.',
    isEarned: ({ stats }) => stats.bestCombo >= 2,
  },
  {
    id: 'stack-overflow',
    name: 'stack overflow',
    description: 'Chain three explosions in one shot.',
    isEarned: ({ stats }) => stats.bestCombo >= 3,
  },
  {
    id: 'kernel-panic',
    name: 'kernel panic',
    description: 'Chain four explosions in one shot.',
    isEarned: ({ stats }) => stats.bestCombo >= 4,
  },
  {
    id: 'sudo',
    name: 'sudo',
    description: 'Trigger your first power-up.',
    isEarned: ({ stats }) => stats.powerUpsTriggered >= 1,
  },
  {
    id: 'garbage-collector',
    name: 'garbage collector',
    description: 'Trigger 50 power-ups.',
    isEarned: ({ stats }) => stats.powerUpsTriggered >= 50,
  },
  {
    id: 'halfway',
    name: 'halfway through the stack',
    description: `Reach level ${Math.ceil(TOTAL_LEVELS / 2)} of the campaign.`,
    isEarned: ({ stats }) => stats.bestLevel.campaign >= Math.ceil(TOTAL_LEVELS / 2),
  },
  {
    id: 'root-access',
    name: 'root access',
    description: 'Complete the campaign.',
    isEarned: ({ stats }) => stats.runsWon >= 1,
  },
  {
    id: 'three-stars',
    name: 'clean build',
    description: 'Earn three stars on any level.',
    isEarned: ({ progress }) => Object.values(progress.stars).some((stars) => stars === 3),
  },
  {
    id: 'twenty-stars',
    name: 'code quality',
    description: 'Collect 20 stars.',
    isEarned: ({ progress }) => totalStars(progress) >= 20,
  },
  {
    id: 'all-stars',
    name: 'fully optimised',
    description: 'Earn three stars on every campaign level.',
    isEarned: ({ progress }) => isCampaignPerfect(progress),
  },
  {
    id: 'uptime',
    name: 'uptime',
    description: 'Play 10 runs.',
    isEarned: ({ stats }) => stats.runsPlayed >= 10,
  },
  {
    id: 'daemon',
    name: 'daemon',
    description: 'Play 50 runs.',
    isEarned: ({ stats }) => stats.runsPlayed >= 50,
  },
  {
    id: 'memory-leak',
    name: 'memory leak',
    description: 'Reach level 15 in an endless run.',
    isEarned: ({ stats }) => stats.bestLevel.endless >= 15,
  },
  {
    id: 'no-oom',
    name: 'no OOM killer',
    description: 'Reach level 25 in an endless run.',
    isEarned: ({ stats }) => stats.bestLevel.endless >= 25,
  },
  {
    id: 'cron',
    name: 'cron job',
    description: 'Play a daily challenge.',
    isEarned: ({ stats }) => stats.bestLevel.daily >= 1,
  },
  {
    id: 'five-figures',
    name: 'five figures',
    description: 'Score 10000 points in a single run.',
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
