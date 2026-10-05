import { create } from 'zustand';
import { newlyEarned, type AchievementState } from '@/engine/core/achievements';
import { recordCampaignLevel } from '@/engine/core/levelProgress';
import { mergeProfiles, type SavedProfile } from '@/engine/core/profileMerge';
import { EMPTY_PROGRESS } from '@/engine/core/progress';
import type { Stars } from '@/engine/core/stars';
import type { RunMode, ScoreMode } from '@/engine/core/runController';
import {
  EMPTY_STATS,
  recordCombo,
  recordLevelCleared,
  recordPowerUp,
  recordRun,
} from '@/engine/core/stats';
import { writeSaveFile } from '@/services/saveFileService';
import { readStored, writeStored } from '@/store/persistence';
import type { RunResult } from '@/types/game.types';

const STORAGE_KEY = 'coredump.progress';

type StoredProfile = SavedProfile;

interface ProgressState extends StoredProfile {
  /** Achievements unlocked but not yet shown to the player. */
  pending: string[];
  recordRunEnd: (result: RunResult) => void;
  recordLevelResult: (level: number, levelScore: number, mode: RunMode) => void;
  noteCombo: (multiplier: number) => void;
  notePowerUp: () => void;
  dismissPending: (id: string) => void;
  clearProfile: () => void;
  /** Merge in the save file read at startup, then write the result to both stores. */
  hydrateFromFile: (raw: string | null) => void;
}

const EMPTY_PROFILE: StoredProfile = {
  progress: EMPTY_PROGRESS,
  stats: EMPTY_STATS,
  earned: [],
  resetAt: 0,
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
 * Parse a saved profile, falling back to an empty one on anything unexpected.
 * The stored shape changes as the game grows and the file is on the player's
 * machine: a parse error, a missing field or a hand-edited value must cost the
 * player their history at worst, never the ability to start the game, and must
 * never leave a number that poisons every later update.
 */
function parseProfile(raw: string | null): StoredProfile {
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
      earned: Array.isArray(parsed.earned)
        ? parsed.earned.filter((id) => typeof id === 'string')
        : [],
      resetAt: safeNumber(parsed.resetAt, 0),
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function writeProfile(profile: StoredProfile): void {
  const text = JSON.stringify(profile);
  writeStored(STORAGE_KEY, text);
  writeSaveFile(text);
}

export const useProgressStore = create<ProgressState>((set, get) => {
  /**
   * Save, then unlock whatever the new state earns, keeping it for a toast.
   * Gameplay updates leave `resetAt` out and keep the current one.
   */
  const commit = (profile: Omit<StoredProfile, 'resetAt'> & { resetAt?: number }): void => {
    const state: AchievementState = { stats: profile.stats, progress: profile.progress };
    const fresh = newlyEarned(state, profile.earned);
    const saved: StoredProfile = {
      ...profile,
      earned: [...profile.earned, ...fresh],
      resetAt: profile.resetAt ?? get().resetAt,
    };
    writeProfile(saved);
    set({ ...saved, pending: [...get().pending, ...fresh] });
  };

  return {
    ...parseProfile(readStored(STORAGE_KEY)),
    pending: [],

    recordRunEnd: (result) => {
      const { progress, stats, earned } = get();
      const recorded = { progress, stats: recordRun(stats, result) };
      // A win ends the run on the final level without a level-complete event,
      // so the final level's rating is recorded here, in the same commit.
      const completed =
        result.mode === 'campaign' && result.won
          ? recordCampaignLevel(progress, recorded.stats, result.levelReached, result.levelScore)
          : recorded;
      commit({ ...completed, earned });
    },

    /**
     * A cleared level: counts towards the statistics always, and towards the
     * campaign stars only in campaign mode, regardless of the level number.
     */
    recordLevelResult: (level, levelScore, mode) => {
      const { progress, stats, earned } = get();
      if (mode !== 'campaign') {
        commit({ progress, stats: recordLevelCleared(stats), earned });
        return;
      }
      commit({ ...recordCampaignLevel(progress, stats, level, levelScore), earned });
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
      const cleared = { ...EMPTY_PROFILE, resetAt: Date.now() };
      writeProfile(cleared);
      set({ ...cleared, pending: [] });
    },

    hydrateFromFile: (raw) => {
      const { progress, stats, earned, resetAt } = get();
      commit(mergeProfiles({ progress, stats, earned, resetAt }, parseProfile(raw)));
    },
  };
});
