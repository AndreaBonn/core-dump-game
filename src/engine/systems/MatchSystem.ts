import { MIN_MATCH } from '@/config/constants';
import { compactBehind } from '@/engine/core/chainOps';
import type { DataPacket } from '@/types/game.types';

const MATCH_BASE_SCORE = 30;
const MATCH_EXTRA_SCORE = 15;

export interface MatchRun {
  start: number;
  length: number;
}

export interface MatchResolution {
  removed: DataPacket[];
  score: number;
  /** Number of consecutive explosions; 1 is a plain match, 2+ is a combo. */
  explosions: number;
}

/** Points for a single explosion of `length` same-type packets (spec 6). */
export function scoreForMatch(length: number): number {
  if (length < MIN_MATCH) {
    return 0;
  }
  return MATCH_BASE_SCORE + (length - MIN_MATCH) * MATCH_EXTRA_SCORE;
}

/**
 * The contiguous run of same-type packets that includes `index`. Returns the
 * run even when shorter than MIN_MATCH; callers check the length.
 */
export function findRun(packets: readonly DataPacket[], index: number): MatchRun {
  const anchor = packets[index];
  if (!anchor) {
    return { start: index, length: 0 };
  }
  const type = anchor.type;
  let start = index;
  while (start > 0 && packets[start - 1]!.type === type) {
    start -= 1;
  }
  let end = index;
  while (end < packets.length - 1 && packets[end + 1]!.type === type) {
    end += 1;
  }
  return { start, length: end - start + 1 };
}

/**
 * Resolve matches triggered by the packet at `insertedIndex`: remove the run,
 * pull the trailing packets forward, and repeat at the new junction so a
 * compaction that lines up matching packets chains into a combo. Mutates the
 * chain in place. Returns null when the insertion produces no match.
 */
export function resolveMatches(
  packets: DataPacket[],
  insertedIndex: number,
): MatchResolution | null {
  let junction = insertedIndex;
  let explosions = 0;
  let score = 0;
  const removed: DataPacket[] = [];

  while (junction >= 0 && junction < packets.length) {
    const run = findRun(packets, junction);
    if (run.length < MIN_MATCH) {
      break;
    }
    explosions += 1;
    removed.push(...packets.splice(run.start, run.length));
    score += scoreForMatch(run.length) * explosions;
    junction = run.start;
    if (junction <= 0 || junction >= packets.length) {
      break;
    }
    compactBehind(packets, junction);
  }

  if (explosions === 0) {
    return null;
  }
  return { removed, score, explosions };
}
