export const RANK_THRESHOLDS: readonly number[] = [0, 500, 1500, 3000, 5000, 8000, 12000, 20000];

// Stable Linux/dev identities make rising ranks feel like gaining system privileges.
const RANK_IDS = [
  'script-kiddie',
  'intern',
  'junior-dev',
  'sysadmin',
  'devops',
  'sre',
  'kernel-hacker',
  'root',
] as const;

export type RankId = (typeof RANK_IDS)[number];

function isRankId(value: string): value is RankId {
  return (RANK_IDS as readonly string[]).includes(value);
}

/** Pending-notification entries for a rank-up share the queue with achievement ids. */
const RANK_PENDING_PREFIX = 'rank:';

/** The notification entry announcing that the profile reached rank `id`. */
export function rankPendingId(id: RankId): string {
  return `${RANK_PENDING_PREFIX}${id}`;
}

/** The rank a notification entry announces, or null for any other entry. */
export function rankIdFromPending(entry: string): RankId | null {
  if (!entry.startsWith(RANK_PENDING_PREFIX)) {
    return null;
  }
  const id = entry.slice(RANK_PENDING_PREFIX.length);
  return isRankId(id) ? id : null;
}

/** How many ranks there are, for "rank k/n". */
export const RANK_COUNT = RANK_THRESHOLDS.length;

export interface Rank {
  /** One-based rank number. */
  readonly index: number;
  readonly id: RankId;
  readonly threshold: number;
  /** Null only for the final rank. */
  readonly nextThreshold: number | null;
  /** Fraction toward the next rank in [0, 1]; one for the final rank. */
  readonly progress: number;
}

/** Return the highest rank reached by XP; negative or NaN XP starts at rank one. */
export function rankFor(xp: number): Rank {
  const normalizedXp = Number.isNaN(xp) ? 0 : Math.max(0, xp);
  const position = RANK_THRESHOLDS.filter((threshold) => threshold <= normalizedXp).length - 1;
  const threshold = RANK_THRESHOLDS[position]!;
  const nextThreshold = RANK_THRESHOLDS[position + 1] ?? null;
  const progress =
    nextThreshold === null
      ? 1
      : Math.max(0, Math.min(1, (normalizedXp - threshold) / (nextThreshold - threshold)));
  return { index: position + 1, id: RANK_IDS[position]!, threshold, nextThreshold, progress };
}
