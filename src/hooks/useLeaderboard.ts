import { useEffect, useState } from 'react';
import type { ScoreMode } from '@/engine/core/runController';
import {
  fetchPersonalBest,
  fetchTopScores,
  isLeaderboardAvailable,
} from '@/services/leaderboardService';
import { useAuthStore } from '@/store/useAuthStore';
import type { ScoreEntry } from '@/types/leaderboard.types';

export type LeaderboardStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface LeaderboardData {
  status: LeaderboardStatus;
  top: ScoreEntry[];
  personalBest: ScoreEntry | null;
}

function initialData(): LeaderboardData {
  return {
    status: isLeaderboardAvailable() ? 'loading' : 'unavailable',
    top: [],
    personalBest: null,
  };
}

/** Top scores and the player's own entry for one mode's board. */
export function useLeaderboard(mode: ScoreMode): LeaderboardData {
  const uid = useAuthStore((state) => state.uid);
  const [data, setData] = useState<LeaderboardData>(initialData);

  useEffect(() => {
    if (!isLeaderboardAvailable()) {
      return;
    }
    let active = true;
    // Switching mode shows the loading state again rather than the previous
    // board's rows, which would read as this mode's results.
    setData(initialData());
    Promise.all([fetchTopScores(mode), uid ? fetchPersonalBest(uid, mode) : Promise.resolve(null)])
      .then(([top, personalBest]) => {
        if (active) {
          setData({ status: 'ready', top, personalBest });
        }
      })
      .catch(() => {
        if (active) {
          setData({ status: 'error', top: [], personalBest: null });
        }
      });
    return () => {
      active = false;
    };
  }, [uid, mode]);

  return data;
}
