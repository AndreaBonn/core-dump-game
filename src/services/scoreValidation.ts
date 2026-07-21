import type { NewScore } from '@/types/leaderboard.types';

export const MAX_SCORE = 1_000_000;
export const MAX_LEVEL = 100;
export const MAX_NICKNAME_LENGTH = 24;

const FALLBACK_PREFIX = 'User_';

/** Clamp a raw score to the non-negative integer range Firestore rules accept. */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(Math.floor(score), MAX_SCORE - 1));
}

/** Clamp a level to the integer range Firestore rules accept. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.floor(level), MAX_LEVEL));
}

/**
 * Trim and bound a nickname, falling back to `User_<4 digits>` derived from the
 * user id when empty so the document always has a non-empty display name.
 */
export function sanitizeDisplayName(nickname: string, userId: string): string {
  const trimmed = nickname.trim().slice(0, MAX_NICKNAME_LENGTH);
  if (trimmed.length > 0) {
    return trimmed;
  }
  const suffix = userId.replace(/\D/g, '').slice(0, 4).padStart(4, '0');
  return `${FALLBACK_PREFIX}${suffix}`;
}

/** Normalise a score submission into the shape the leaderboard stores. */
export function normalizeScore(input: NewScore, userId: string): NewScore {
  return {
    displayName: sanitizeDisplayName(input.displayName, userId),
    score: clampScore(input.score),
    levelReached: clampLevel(input.levelReached),
  };
}
