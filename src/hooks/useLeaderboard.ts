import { useEffect, useState } from 'react';
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

export function useLeaderboard(): LeaderboardData {
  const uid = useAuthStore((state) => state.uid);
  const [data, setData] = useState<LeaderboardData>({
    status: isLeaderboardAvailable() ? 'loading' : 'unavailable',
    top: [],
    personalBest: null,
  });

  useEffect(() => {
    if (!isLeaderboardAvailable()) {
      return;
    }
    let active = true;
    Promise.all([fetchTopScores(), uid ? fetchPersonalBest(uid) : Promise.resolve(null)])
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
  }, [uid]);

  return data;
}
