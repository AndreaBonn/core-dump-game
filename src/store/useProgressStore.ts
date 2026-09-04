import { create } from 'zustand';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import { newlyEarned, type AchievementState } from '@/engine/core/achievements';
import { EMPTY_PROGRESS, recordLevel, type CampaignProgress } from '@/engine/core/progress';
import { starsFor, type Stars } from '@/engine/core/stars';
import type { ScoreMode } from '@/engine/core/runController';
import {
  EMPTY_STATS,
  recordCombo,
  recordLevelCleared,
  recordPowerUp,
  recordRun,
  type PlayerStats,
} from '@/engine/core/stats';
import { readStored, writeStored } from '@/store/persistence';
import type { RunResult } from '@/types/game.types';

const STORAGE_KEY = 'coredump.progress';

interface StoredProfile {
  progress: CampaignProgress;
  stats: PlayerStats;
  earned: string[];
}

interface ProgressState extends StoredProfile {
  /** Achievements unlocked but not yet shown to the player. */
  pending: string[];
  recordRunEnd: (result: RunResult) => void;
  recordLevelResult: (level: number, levelScore: number) => void;
  noteCombo: (multiplier: number) => void;
  notePowerUp: () => void;
  dismissPending: (id: string) => void;
  clearProfile: () => void;
}

const EMPTY_PROFILE: StoredProfile = {
  progress: EMPTY_PROGRESS,
  stats: EMPTY_STATS,
  earned: [],
};

const SCORED_MODES: readonly ScoreMode[] = ['campaign', 'endless', 'daily'];

/** A stored number, or the default when it is missing, broken or negative. */
function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Per-mode records, filled in mode by mode. A shallow spread would be wrong:
 * a profile saved before a mode existed has no key for it, the spread would
 * replace the whole record with the partial one, and the first `Math.max`
 * against `undefined` would turn that mode's best into NaN for good.
 */
function safeByMode(
  stored: unknown,
  fallback: Readonly<Record<ScoreMode, number>>,
): Record<ScoreMode, number> {
  const source = (stored ?? {}) as Partial<Record<ScoreMode, unknown>>;
  const result = { ...fallback } as Record<ScoreMode, number>;
  for (const mode of SCORED_MODES) {
    result[mode] = safeNumber(source[mode], fallback[mode]);
  }
  return result;
}

/** Stars are a compile-time union; a stored file can hold anything. */
function safeStars(stored: unknown): Readonly<Record<number, Stars>> {
  const source = (stored ?? {}) as Record<string, unknown>;
  const stars: Record<number, Stars> = {};
  for (const [key, value] of Object.entries(source)) {
    const level = Number(key);
    const earned = Math.round(safeNumber(value, 0));
    if (Number.isInteger(level) && level >= 1 && earned >= 1 && earned <= 3) {
      stars[level] = earned as Stars;
    }
  }
  return stars;
}

/**
 * Read the saved profile, falling back to an empty one on anything unexpected.
 * The stored shape changes as the game grows and the file is on the player's
 * machine: a parse error, a missing field or a hand-edited value must cost the
 * player their history at worst, never the ability to start the game, and must
 * never leave a number that poisons every later update.
 */
function readProfile(): StoredProfile {
  const raw = readStored(STORAGE_KEY);
  if (!raw) {
    return EMPTY_PROFILE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      progress: {
        stars: safeStars(parsed.progress?.stars),
        unlockedThrough: Math.max(1, Math.round(safeNumber(parsed.progress?.unlockedThrough, 1))),
      },
      stats: {
        ...EMPTY_STATS,
        ...parsed.stats,
        runsPlayed: safeNumber(parsed.stats?.runsPlayed, 0),
        runsWon: safeNumber(parsed.stats?.runsWon, 0),
        levelsCleared: safeNumber(parsed.stats?.levelsCleared, 0),
        powerUpsTriggered: safeNumber(parsed.stats?.powerUpsTriggered, 0),
        bestCombo: safeNumber(parsed.stats?.bestCombo, 0),
        bestScore: safeByMode(parsed.stats?.bestScore, EMPTY_STATS.bestScore),
        bestLevel: safeByMode(parsed.stats?.bestLevel, EMPTY_STATS.bestLevel),
      },
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((id) => typeof id === 'string') : [],
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function writeProfile(profile: StoredProfile): void {
  writeStored(STORAGE_KEY, JSON.stringify(profile));
}

export const useProgressStore = create<ProgressState>((set, get) => {
  /** Save, then unlock whatever the new state earns, keeping it for a toast. */
  const commit = (profile: StoredProfile): void => {
    const state: AchievementState = { stats: profile.stats, progress: profile.progress };
    const fresh = newlyEarned(state, profile.earned);
    const saved = { ...profile, earned: [...profile.earned, ...fresh] };
    writeProfile(saved);
    set({ ...saved, pending: [...get().pending, ...fresh] });
  };

  return {
    ...readProfile(),
    pending: [],

    recordRunEnd: (result) => {
      const { progress, stats, earned } = get();
      commit({ progress, stats: recordRun(stats, result), earned });
    },

    /**
     * A cleared level: counts towards the statistics always, and towards the
     * campaign stars only when it is a campaign level. Endless and daily run
     * past the campaign and have no rating to award.
     */
    recordLevelResult: (level, levelScore) => {
      const { progress, stats, earned } = get();
      const cleared = recordLevelCleared(stats);
      if (level > TOTAL_LEVELS) {
        commit({ progress, stats: cleared, earned });
        return;
      }
      const stars = starsFor(levelScore, getLevel(level).starThresholds);
      commit({ progress: recordLevel(progress, level, stars), stats: cleared, earned });
    },

    noteCombo: (multiplier) => {
      const { progress, stats, earned } = get();
      commit({ progress, stats: recordCombo(stats, multiplier), earned });
    },

    notePowerUp: () => {
      const { progress, stats, earned } = get();
      commit({ progress, stats: recordPowerUp(stats), earned });
    },

    dismissPending: (id) => set({ pending: get().pending.filter((entry) => entry !== id) }),

    clearProfile: () => {
      writeProfile(EMPTY_PROFILE);
      set({ ...EMPTY_PROFILE, pending: [] });
    },
  };
});
