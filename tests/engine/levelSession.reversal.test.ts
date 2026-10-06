import { describe, expect, it } from 'vitest';
import { getLevel, type ReversalSchedule } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { SLEEP_FACTOR } from '@/config/powerUps';
import { LevelSession } from '@/engine/LevelSession';
import { Chain } from '@/engine/entities/Chain';
import { createPacket } from '@/engine/entities/DataPacket';
import { createSessionBoard, fireSessionShot } from '../helpers/sessionBoard';

const SCHEDULE = { period: 8, duration: 1.5, factor: -0.5 };
const STEP = 0.125;
const SPEED = 20;

function createSession(reversal: ReversalSchedule | null = SCHEDULE): LevelSession {
  return new LevelSession({ ...getLevel(1)!, chainSpeed: SPEED, chainLength: 3, reversal });
}

function advanceTo(session: LevelSession, elapsed: number): void {
  for (let time = 0; time < elapsed; time += STEP) session.step(STEP, colorForType);
}

function nextDistanceDelta(session: LevelSession): number {
  const before = session.chain.frontDistance;
  session.step(STEP, colorForType);
  return session.chain.frontDistance - before;
}

describe('LevelSession reversal', () => {
  it('moves backward inside the window and forward before and after it', () => {
    const session = createSession();
    expect(nextDistanceDelta(session)).toBe(SPEED * STEP);
    advanceTo(session, 7.75);
    expect(nextDistanceDelta(session)).toBe(SPEED * STEP * -0.5);
    expect(nextDistanceDelta(session)).toBe(SPEED * STEP * -0.5);
    advanceTo(session, 1.25);
    expect(nextDistanceDelta(session)).toBe(SPEED * STEP);
  });

  it('keeps forward motion for null schedules at the same elapsed time', () => {
    const reversing = createSession();
    advanceTo(reversing, 8);
    expect(nextDistanceDelta(reversing)).toBe(-1.25);
    const forward = createSession(null);
    advanceTo(forward, 8);
    expect(nextDistanceDelta(forward)).toBe(2.5);
  });

  it('composes reversal with the SLEEP speed multiplier', () => {
    const board = createSessionBoard([]);
    const session = LevelSession.fromParts(
      { ...getLevel(1)!, chainSpeed: SPEED, reversal: SCHEDULE },
      { path: board.path, cursor: board.cursor, chain: new Chain([], SPEED) },
    );
    advanceTo(session, 8);
    session.chain.packets.push(
      createPacket({ type: 'SUCCESS', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200, powerUpType: 'SLEEP' }),
      createPacket({ type: 'ERROR', distance: 216 }),
    );
    expect(fireSessionShot(session)).toContainEqual({ kind: 'powerUp', type: 'SLEEP' });
    expect(nextDistanceDelta(session)).toBeCloseTo(SPEED * STEP * -0.5 * SLEEP_FACTOR);
  });
});
