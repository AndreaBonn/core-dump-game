import { create } from 'zustand';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import { newlyEarned, type AchievementState } from '@/engine/core/achievements';
import { EMPTY_PROGRESS, recordLevel, type CampaignProgress } from '@/engine/core/progress';
import { starsFor } from '@/engine/core/stars';
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

/**
 * Read the saved profile, falling back to an empty one on anything unexpected.
 * The stored shape changes as the game grows and the file is on the player's
 * machine: a parse error or a missing field must cost the player their history
 * at worst, never the ability to start the game.
 */
function readProfile(): StoredProfile {
  const raw = readStored(STORAGE_KEY);
  if (!raw) {
    return EMPTY_PROFILE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      progress: { ...EMPTY_PROGRESS, ...parsed.progress },
      stats: { ...EMPTY_STATS, ...parsed.stats },
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
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
