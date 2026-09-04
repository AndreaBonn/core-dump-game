import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { ScoreMode } from '@/engine/core/runController';
import { getFirebase, isFirebaseConfigured } from '@/services/firebase';
import { normalizeScore } from '@/services/scoreValidation';
import type { NewScore, ScoreEntry } from '@/types/leaderboard.types';

const LEADERBOARDS = 'leaderboards';
const SCORES = 'scores';
const TOP_LIMIT = 10;

/** What happened to a submitted score. Failing to beat your own is not an error. */
export type SaveOutcome = 'saved' | 'notABest';

export function isLeaderboardAvailable(): boolean {
  return isFirebaseConfigured();
}

function mapDoc(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>) {
  const data = snapshot.data() ?? {};
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
 * Persist a score as the player's best for that mode. One document per player
 * per mode (`leaderboards/{mode}/scores/{uid}`), so a run that does not beat
 * the stored best writes nothing: the security rules only accept a create or
 * an update that raises the score, and the client must not fight them.
 *
 * Throws on network/permission failure so the caller can surface a
 * non-blocking error state (spec 8.4).
 */
export async function saveScore(
  input: NewScore,
  userId: string,
  mode: ScoreMode,
): Promise<SaveOutcome> {
  const firebase = await getFirebase();
  if (!firebase) {
    throw new Error('Leaderboard is not configured');
  }
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const reference = doc(firebase.db, LEADERBOARDS, mode, SCORES, userId);
  const normalized = normalizeScore(input, userId);
  const existing = await getDoc(reference);
  if (existing.exists() && Number(existing.data()?.score ?? 0) >= normalized.score) {
    return 'notABest';
  }
  await setDoc(reference, { userId, ...normalized, timestamp: serverTimestamp() });
  return 'saved';
}

/** Top scores for one mode, highest first. Returns [] when not configured. */
export async function fetchTopScores(mode: ScoreMode, max = TOP_LIMIT): Promise<ScoreEntry[]> {
  const firebase = await getFirebase();
  if (!firebase) {
    return [];
  }
  const { collection, getDocs, limit, orderBy, query } = await import('firebase/firestore');
  const topQuery = query(
    collection(firebase.db, LEADERBOARDS, mode, SCORES),
    orderBy('score', 'desc'),
    limit(max),
  );
  const snapshot = await getDocs(topQuery);
  return snapshot.docs.map(mapDoc);
}

/**
 * The player's best score in one mode. A direct read of their document: one
 * read, no scan, and no way for the answer to depend on how many runs they
 * have played.
 */
export async function fetchPersonalBest(userId: string, mode: ScoreMode): Promise<ScoreEntry | null> {
  const firebase = await getFirebase();
  if (!firebase) {
    return null;
  }
  const { doc, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(doc(firebase.db, LEADERBOARDS, mode, SCORES, userId));
  return snapshot.exists() ? mapDoc(snapshot) : null;
}

/** Remove the player's score for one mode (the right to erasure, spec F8). */
export async function deletePersonalScore(userId: string, mode: ScoreMode): Promise<void> {
  const firebase = await getFirebase();
  if (!firebase) {
    throw new Error('Leaderboard is not configured');
  }
  const { deleteDoc, doc } = await import('firebase/firestore');
  await deleteDoc(doc(firebase.db, LEADERBOARDS, mode, SCORES, userId));
}
