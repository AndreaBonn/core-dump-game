import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/services/firebase', () => ({
  getFirebase: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: 'new' })),
  collection: vi.fn((db: unknown, name: string) => ({ db, name })),
  serverTimestamp: vi.fn(() => 'TS'),
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => ({ limit: n })),
  orderBy: vi.fn(() => 'orderBy'),
  query: vi.fn((...args: unknown[]) => ({ query: args })),
  where: vi.fn(() => 'where'),
}));

import {
  fetchPersonalBest,
  fetchTopScores,
  isLeaderboardAvailable,
  saveScore,
} from '@/services/leaderboardService';
import { getFirebase, isFirebaseConfigured } from '@/services/firebase';
import { addDoc, getDocs } from 'firebase/firestore';

interface RawScore {
  userId?: string;
  displayName?: string;
  score?: number;
  levelReached?: number;
  timestamp?: { toMillis: () => number };
}

function fakeSnapshot(id: string, data: RawScore) {
  return { id, data: () => data };
}

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isLeaderboardAvailable', () => {
    it('mirrors the Firebase configuration state', () => {
      (isFirebaseConfigured as Mock).mockReturnValue(true);
      expect(isLeaderboardAvailable()).toBe(true);
      (isFirebaseConfigured as Mock).mockReturnValue(false);
      expect(isLeaderboardAvailable()).toBe(false);
    });
  });

  describe('saveScore', () => {
    it('throws when the leaderboard is not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      await expect(saveScore({ displayName: 'a', score: 1, levelReached: 1 }, 'u')).rejects.toThrow(
        'Leaderboard is not configured',
      );
    });

    it('persists a normalised document under the user id with a server timestamp', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });

      await saveScore({ displayName: '  Neo  ', score: 12.9, levelReached: 999 }, 'uid123');

      expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({ name: 'scores' }), {
        userId: 'uid123',
        displayName: 'Neo',
        score: 12,
        levelReached: 100,
        timestamp: 'TS',
      });
    });
  });

  describe('fetchTopScores', () => {
    it('returns an empty list when not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      expect(await fetchTopScores()).toEqual([]);
    });

    it('maps documents and fills defaults for missing fields', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDocs as Mock).mockResolvedValue({
        docs: [
          fakeSnapshot('d1', {
            userId: 'u1',
            displayName: 'neo',
            score: 500,
            levelReached: 3,
            timestamp: { toMillis: () => 1234 },
          }),
          fakeSnapshot('d2', {}),
        ],
      });

      const result = await fetchTopScores();

      expect(result).toEqual([
        {
          id: 'd1',
          userId: 'u1',
          displayName: 'neo',
          score: 500,
          levelReached: 3,
          timestampMs: 1234,
        },
        { id: 'd2', userId: '', displayName: 'anon', score: 0, levelReached: 1, timestampMs: 0 },
      ]);
    });
  });

  describe('fetchPersonalBest', () => {
    it('returns null when not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      expect(await fetchPersonalBest('u')).toBeNull();
    });

    it('returns null when the user has no scores', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDocs as Mock).mockResolvedValue({ docs: [] });
      expect(await fetchPersonalBest('u')).toBeNull();
    });

    it('returns the highest-scoring entry for the user', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDocs as Mock).mockResolvedValue({
        docs: [
          fakeSnapshot('a', { userId: 'u', score: 100, levelReached: 2 }),
          fakeSnapshot('b', { userId: 'u', score: 300, levelReached: 5 }),
          fakeSnapshot('c', { userId: 'u', score: 200, levelReached: 4 }),
        ],
      });

      const best = await fetchPersonalBest('u');

      expect(best?.id).toBe('b');
      expect(best?.score).toBe(300);
    });
  });
});
