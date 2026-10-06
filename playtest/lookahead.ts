import { FIXED_TIMESTEP } from '@/config/constants';
import { colorForType } from '@/config/packetTypes';
import type { LevelSession } from '@/engine/LevelSession';
import type { Vec2 } from '@/engine/math/vec2';
import { findRun } from '@/engine/systems/MatchSystem';
import { cloneSession } from './sessionClone';

// A projectile crosses the whole board in about a second; two leave margin.
const LOOKAHEAD_STEPS = Math.round(2 / FIXED_TIMESTEP);

const BREACH_RANK = -2;
const LONE_PACKET_RANK = -1;
const MISS_RANK = 0;
const PAIR = 2;
// Above any run length, so every match outranks every placement.
const MATCH_RANK = 1_000;

export interface ShotPlan {
  readonly aimPoint: Vec2;
  readonly shouldSwap: boolean;
}

/** What a shot did once played out on a copy of the board. */
export interface ShotValue {
  readonly score: number;
  /** Length of the same-type run the shot joined, 0 when it matched or missed. */
  readonly run: number;
  readonly hit: boolean;
  readonly breached: boolean;
}

function runAround(session: LevelSession, packetId: number | null): number {
  const index = session.chain.packets.findIndex(({ id }) => id === packetId);
  return index < 0 ? 0 : findRun(session.chain.packets, index).length;
}

/** Play a shot forward on a copy until every projectile has landed or left. */
export function tryShot(session: LevelSession, plan: ShotPlan): ShotValue {
  const copy = cloneSession(session);
  if (plan.shouldSwap) copy.swap();
  copy.aim(plan.aimPoint);
  copy.fire();
  let value: ShotValue = { score: 0, run: 0, hit: false, breached: false };
  for (let step = 0; step < LOOKAHEAD_STEPS && copy.projectiles.length > 0; step += 1) {
    for (const event of copy.step(FIXED_TIMESTEP, colorForType)) {
      if (event.kind === 'breached') return { ...value, breached: true };
      if (event.kind !== 'shot') continue;
      const { score, insertedId } = event.outcome;
      value = { ...value, hit: true, score: value.score + score, run: runAround(copy, insertedId) };
    }
  }
  return value;
}

/**
 * Rank of a played-out shot, higher is better: a breach is the worst, then a
 * lone packet that only lengthens the chain, then a miss, then a growing run,
 * then any match by its score.
 */
export function rankShot(value: ShotValue): number {
  if (value.breached) return BREACH_RANK;
  if (value.score > 0) return MATCH_RANK + value.score;
  if (!value.hit) return MISS_RANK;
  return value.run >= PAIR ? value.run : LONE_PACKET_RANK;
}
