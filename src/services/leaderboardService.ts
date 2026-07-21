import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getFirebase, isFirebaseConfigured } from '@/services/firebase';
import { normalizeScore } from '@/services/scoreValidation';
import type { NewScore, ScoreEntry } from '@/types/leaderboard.types';

const COLLECTION = 'scores';
const TOP_LIMIT = 10;
const PERSONAL_SCAN_LIMIT = 50;

export function isLeaderboardAvailable(): boolean {
  return isFirebaseConfigured();
}

function mapDoc(snapshot: QueryDocumentSnapshot<DocumentData>): ScoreEntry {
  const data = snapshot.data();
  const timestamp = data.timestamp as { toMillis?: () => number } | undefined;
  return {
    id: snapshot.id,
    userId: String(data.userId ?? ''),
    displayName: String(data.displayName ?? 'anon'),
    score: Number(data.score ?? 0),
    levelReached: Number(data.levelReached ?? 1),
    timestampMs: timestamp?.toMillis?.() ?? 0,
  };
}

/**
 * Persist a score for the given user. Throws on network/permission failure so
 * the caller can surface a non-blocking error state (spec 8.4).
 */
export async function saveScore(input: NewScore, userId: string): Promise<void> {
  const firebase = await getFirebase();
  if (!firebase) {
    throw new Error('Leaderboard is not configured');
  }
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  const normalized = normalizeScore(input, userId);
  await addDoc(collection(firebase.db, COLLECTION), {
    userId,
    ...normalized,
    timestamp: serverTimestamp(),
  });
}

/** Top scores globally, highest first. Returns [] when not configured. */
export async function fetchTopScores(max = TOP_LIMIT): Promise<ScoreEntry[]> {
  const firebase = await getFirebase();
  if (!firebase) {
    return [];
  }
  const { collection, getDocs, limit, orderBy, query } = await import('firebase/firestore');
  const topQuery = query(collection(firebase.db, COLLECTION), orderBy('score', 'desc'), limit(max));
  const snapshot = await getDocs(topQuery);
  return snapshot.docs.map(mapDoc);
}

/** The user's best score, or null when they have none or when not configured. */
export async function fetchPersonalBest(userId: string): Promise<ScoreEntry | null> {
  const firebase = await getFirebase();
  if (!firebase) {
    return null;
  }
  const { collection, getDocs, limit, query, where } = await import('firebase/firestore');
  const personalQuery = query(
    collection(firebase.db, COLLECTION),
    where('userId', '==', userId),
    limit(PERSONAL_SCAN_LIMIT),
  );
  const snapshot = await getDocs(personalQuery);
  const entries = snapshot.docs.map(mapDoc);
  if (entries.length === 0) {
    return null;
  }
  return entries.reduce((best, entry) => (entry.score > best.score ? entry : best));
}
