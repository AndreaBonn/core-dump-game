import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/services/firebase', () => ({
  getFirebase: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db: unknown, ...path: string[]) => ({ db, path: path.join('/') })),
  doc: vi.fn((db: unknown, ...path: string[]) => ({ db, path: path.join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'TS'),
  limit: vi.fn((n: number) => ({ limit: n })),
  orderBy: vi.fn((field: string, direction: string) => ({ orderBy: field, direction })),
  query: vi.fn((...args: unknown[]) => ({ query: args })),
}));

import {
  deletePersonalScore,
  fetchPersonalBest,
  fetchTopScores,
  isLeaderboardAvailable,
  saveScore,
} from '@/services/leaderboardService';
import { getFirebase, isFirebaseConfigured } from '@/services/firebase';
import { deleteDoc, getDoc, getDocs, orderBy, setDoc } from 'firebase/firestore';

interface RawScore {
  userId?: string;
  displayName?: string;
  score?: number;
  levelReached?: number;
  timestamp?: { toMillis: () => number };
}

function fakeSnapshot(id: string, data: RawScore) {
  return { id, data: () => data, exists: () => true };
}

const missing = { id: 'none', data: () => undefined, exists: () => false };

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
      await expect(
        saveScore({ displayName: 'a', score: 1, levelReached: 1 }, 'u', 'campaign'),
      ).rejects.toThrow('Leaderboard is not configured');
    });

    it('writes a normalised first score under the mode and the user id', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(missing);

      const outcome = await saveScore(
        { displayName: '  Neo  ', score: 12.9, levelReached: 999 },
        'uid123',
        'endless',
      );

      expect(outcome).toBe('saved');
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'leaderboards/endless/scores/uid123' }),
        {
          userId: 'uid123',
          displayName: 'Neo',
          score: 12,
          levelReached: 100,
          timestamp: 'TS',
        },
      );
    });

    it('replaces the stored score when the new run beats it', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(fakeSnapshot('uid123', { score: 100 }));

      const outcome = await saveScore(
        { displayName: 'neo', score: 300, levelReached: 4 },
        'uid123',
        'campaign',
      );

      expect(outcome).toBe('saved');
      expect(setDoc).toHaveBeenCalled();
    });

    it('writes nothing when the run does not beat the stored best', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(fakeSnapshot('uid123', { score: 500 }));

      const outcome = await saveScore(
        { displayName: 'neo', score: 300, levelReached: 4 },
        'uid123',
        'campaign',
      );

      expect(outcome).toBe('notABest');
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('treats an equal score as not a best, so the rules never reject the write', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(fakeSnapshot('uid123', { score: 300 }));

      const outcome = await saveScore(
        { displayName: 'neo', score: 300, levelReached: 4 },
        'uid123',
        'campaign',
      );

      expect(outcome).toBe('notABest');
      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('fetchTopScores', () => {
    it('returns an empty list when not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      expect(await fetchTopScores('campaign')).toEqual([]);
    });

    it('reads the requested mode, ordered by score', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDocs as Mock).mockResolvedValue({ docs: [] });

      await fetchTopScores('daily');

      expect(orderBy).toHaveBeenCalledWith('score', 'desc');
      const { collection } = await import('firebase/firestore');
      expect(collection).toHaveBeenCalledWith({}, 'leaderboards', 'daily', 'scores');
    });

    it('maps documents and fills defaults for missing fields', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDocs as Mock).mockResolvedValue({
        docs: [
          fakeSnapshot('u1', {
            userId: 'u1',
            displayName: 'neo',
            score: 500,
            levelReached: 3,
            timestamp: { toMillis: () => 1234 },
          }),
          fakeSnapshot('u2', {}),
        ],
      });

      const result = await fetchTopScores('campaign');

      expect(result).toEqual([
        {
          id: 'u1',
          userId: 'u1',
          displayName: 'neo',
          score: 500,
          levelReached: 3,
          timestampMs: 1234,
        },
        { id: 'u2', userId: '', displayName: 'anon', score: 0, levelReached: 1, timestampMs: 0 },
      ]);
    });
  });

  describe('fetchPersonalBest', () => {
    it('returns null when not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      expect(await fetchPersonalBest('u', 'campaign')).toBeNull();
    });

    it('returns null when the player has no score in that mode', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(missing);
      expect(await fetchPersonalBest('u', 'campaign')).toBeNull();
    });

    it('reads the score straight from the document, whatever the play history', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });
      (getDoc as Mock).mockResolvedValue(
        fakeSnapshot('u', { userId: 'u', score: 9999, levelReached: 7 }),
      );

      const best = await fetchPersonalBest('u', 'endless');

      expect(best?.score).toBe(9999);
      // One read of one document: no scan whose result depends on how many
      // runs the player has saved (the defect this schema removes).
      expect(getDocs).not.toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('deletePersonalScore', () => {
    it('throws when the leaderboard is not configured', async () => {
      (getFirebase as Mock).mockResolvedValue(null);
      await expect(deletePersonalScore('u', 'campaign')).rejects.toThrow(
        'Leaderboard is not configured',
      );
    });

    it('deletes the document of that player in that mode only', async () => {
      (getFirebase as Mock).mockResolvedValue({ db: {} });

      await deletePersonalScore('uid123', 'daily');

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'leaderboards/daily/scores/uid123' }),
      );
    });
  });
});
