import { expect, it } from 'vitest';
import { FIXED_TIMESTEP } from '@/config/constants';
import { getLevel } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { LevelSession } from '@/engine/LevelSession';
import { vec2 } from '@/engine/math/vec2';
import { cloneSession } from '../../playtest/sessionClone';

const STEPS = 240;

function snapshot(session: LevelSession): string {
  return JSON.stringify({
    packets: session.chain.packets.map(({ type, distance }) => [type, distance]),
    shots: session.projectiles.length,
    cursor: [session.cursor.angle, session.cursor.currentType, session.cursor.nextType],
  });
}

function advance(session: LevelSession, steps: number): void {
  for (let step = 0; step < steps; step += 1) session.step(FIXED_TIMESTEP, colorForType);
}

it('cloneSession_playingTheCopy_leavesTheOriginalUntouched', (): void => {
  const original = new LevelSession(getLevel(3));
  advance(original, STEPS);
  const before = snapshot(original);

  const copy = cloneSession(original);
  copy.aim(vec2(100, 100));
  copy.fire();
  advance(copy, STEPS);

  expect(snapshot(copy)).not.toBe(before);
  expect(snapshot(original)).toBe(before);
});

it('cloneSession_withoutDraws_evolvesExactlyLikeTheOriginal', (): void => {
  const original = new LevelSession(getLevel(3));
  advance(original, STEPS);

  const copy = cloneSession(original);
  advance(copy, STEPS);
  advance(original, STEPS);

  expect(snapshot(copy)).toBe(snapshot(original));
});
