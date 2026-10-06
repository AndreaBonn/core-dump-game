import type { LevelSession } from '@/engine/LevelSession';
import type { DataPacket, PacketType } from '@/types/game.types';
import { rankShot, tryShot, type ShotPlan } from './lookahead';

export const FIRE_INTERVAL_SECONDS = 0.35;
const CASUAL_ERROR_INTERVAL = 3;
const PATH_ENTRY_DISTANCE = 0;
// Below this rank a shot only lengthens the chain.
const WORTHWHILE_RANK = 0;

export type SkillLevel = 'casual' | 'skilled';

interface Candidate {
  readonly target: number;
  readonly shouldSwap: boolean;
}

const isVisible = (packet: DataPacket): boolean => packet.distance >= PATH_ENTRY_DISTANCE;

/** Indexes of the visible packets that open or close a run of the wanted type. */
function runEnds(packets: readonly DataPacket[], type: PacketType): number[] {
  return packets.flatMap((packet, index) => {
    if (!isVisible(packet) || !packet.matchable || packet.type !== type) return [];
    const inside = packets[index - 1]?.type === type && packets[index + 1]?.type === type;
    return inside ? [] : [index];
  });
}

/**
 * Each run end of the ready type, and of the next one with a swap, nearest the
 * void first so ties go to the packet about to breach. With no run to join,
 * every visible packet: a stranded colour still has to be shot to change it.
 */
function candidates(session: LevelSession, skill: SkillLevel): Candidate[] {
  const { chain, cursor } = session;
  const types = skill === 'skilled' ? [cursor.currentType, cursor.nextType] : [cursor.currentType];
  const joins = types.flatMap((type, slot) =>
    runEnds(chain.packets, type).map((target) => ({ target, shouldSwap: slot === 1 })),
  );
  const pool = joins.length > 0 ? joins : visibleTargets(chain.packets);
  return pool.sort((a, b) => b.target - a.target);
}

function visibleTargets(packets: readonly DataPacket[]): Candidate[] {
  return packets.flatMap((packet, target) =>
    isVisible(packet) ? [{ target, shouldSwap: false }] : [],
  );
}

function planFor(session: LevelSession, candidate: Candidate): ShotPlan {
  const packet = session.chain.packets[candidate.target]!;
  return { aimPoint: session.path.pointAt(packet.distance), shouldSwap: candidate.shouldSwap };
}

function best(session: LevelSession, pool: readonly Candidate[]) {
  let found: { candidate: Candidate; rank: number } | null = null;
  for (const candidate of pool) {
    const rank = rankShot(tryShot(session, planFor(session, candidate)));
    if (!found || rank > found.rank) found = { candidate, rank };
  }
  return found;
}

/**
 * Choose the next shot by playing each candidate forward on a copy of the
 * board. Skilled weighs the swap and, while packets are still entering, holds
 * fire rather than feed the chain a lone packet; casual plays the ready packet
 * and slips one packet off every third shot. Return null to hold fire.
 */
export function chooseShot(
  session: LevelSession,
  skill: SkillLevel,
  shotCount: number,
): ShotPlan | null {
  const found = best(session, candidates(session, skill));
  if (!found) return null;
  const { candidate, rank } = found;
  if (skill === 'skilled') {
    const entering = session.chain.packets.some((packet) => !isVisible(packet));
    return rank < WORTHWHILE_RANK && entering ? null : planFor(session, candidate);
  }
  const slips = (shotCount + 1) % CASUAL_ERROR_INTERVAL === 0;
  const last = session.chain.packets.length - 1;
  const target = slips ? Math.min(candidate.target + 1, last) : candidate.target;
  return planFor(session, { ...candidate, target });
}
