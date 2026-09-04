import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/leaderboardService', () => ({
  fetchTopScores: vi.fn(),
  fetchPersonalBest: vi.fn(),
  isLeaderboardAvailable: vi.fn(),
}));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { uid: string | null }) => unknown) => selector({ uid: 'uid1' }),
}));

import { useLeaderboard } from '@/hooks/useLeaderboard';
import {
  fetchPersonalBest,
  fetchTopScores,
  isLeaderboardAvailable,
} from '@/services/leaderboardService';
import type { ScoreMode } from '@/engine/core/runController';
import type { ScoreEntry } from '@/types/leaderboard.types';

function entry(id: string, score: number): ScoreEntry {
  return { id, userId: id, displayName: id, score, levelReached: 1, timestampMs: 0 };
}

describe('useLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLeaderboardAvailable as Mock).mockReturnValue(true);
  });

  it('reports unavailable without calling the service when Firebase is not configured', () => {
    (isLeaderboardAvailable as Mock).mockReturnValue(false);

    const { result } = renderHook(() => useLeaderboard('campaign'));

    expect(result.current.status).toBe('unavailable');
    expect(fetchTopScores).not.toHaveBeenCalled();
  });

  it('starts loading and then reports the board for the requested mode', async () => {
    (fetchTopScores as Mock).mockResolvedValue([entry('a', 300)]);
    (fetchPersonalBest as Mock).mockResolvedValue(entry('uid1', 120));

    const { result } = renderHook(() => useLeaderboard('endless'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.top).toHaveLength(1);
    expect(result.current.personalBest?.score).toBe(120);
    expect(fetchTopScores).toHaveBeenCalledWith('endless');
    expect(fetchPersonalBest).toHaveBeenCalledWith('uid1', 'endless');
  });

  it('reports an error without leaving stale rows on screen', async () => {
    (fetchTopScores as Mock).mockRejectedValue(new Error('offline'));
    (fetchPersonalBest as Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useLeaderboard('campaign'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.top).toEqual([]);
    expect(result.current.personalBest).toBeNull();
  });

  it('reloads when the mode changes and does not show the previous board', async () => {
    (fetchTopScores as Mock).mockResolvedValue([entry('a', 300)]);
    (fetchPersonalBest as Mock).mockResolvedValue(null);

    const { result, rerender } = renderHook(({ mode }) => useLeaderboard(mode), {
      initialProps: { mode: 'campaign' as ScoreMode },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    (fetchTopScores as Mock).mockResolvedValue([entry('b', 999)]);
    rerender({ mode: 'daily' as ScoreMode });

    await waitFor(() => expect(result.current.top[0]?.id).toBe('b'));
    expect(fetchTopScores).toHaveBeenLastCalledWith('daily');
  });
});
