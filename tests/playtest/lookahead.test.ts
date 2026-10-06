import { expect, it } from 'vitest';
import { FIXED_TIMESTEP } from '@/config/constants';
import { getLevel } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { LevelSession } from '@/engine/LevelSession';
import { chooseShot, FIRE_INTERVAL_SECONDS } from '../../playtest/bot';
import { rankShot, tryShot, type ShotPlan, type ShotValue } from '../../playtest/lookahead';

const DECISIONS = 30;
const FIRE_EVERY = Math.round(FIRE_INTERVAL_SECONDS / FIXED_TIMESTEP);

/** Fire a plan for real and step until it lands, reporting what the game did. */
function playForReal(session: LevelSession, plan: ShotPlan): boolean {
  if (plan.shouldSwap) session.swap();
  session.aim(plan.aimPoint);
  session.fire();
  let matched = false;
  while (session.projectiles.length > 0) {
    for (const event of session.step(FIXED_TIMESTEP, colorForType)) {
      if (event.kind === 'shot' && event.outcome.explosions > 0) matched = true;
    }
  }
  return matched;
}

it('tryShot_onLevelOne_predictsWhetherEachChosenShotMatches', (): void => {
  const session = new LevelSession(getLevel(1));
  const mismatches: number[] = [];
  let predictedMatches = 0;
  for (let decision = 0; decision < DECISIONS; decision += 1) {
    for (let step = 0; step < FIRE_EVERY; step += 1) session.step(FIXED_TIMESTEP, colorForType);
    const plan = chooseShot(session, 'skilled', decision);
    if (!plan) continue;
    const predicted = tryShot(session, plan).score > 0;
    if (predicted) predictedMatches += 1;
    if (playForReal(session, plan) !== predicted) mismatches.push(decision);
  }

  expect(mismatches).toEqual([]);
  // Guard against a vacuous pass: the sample has to contain real matches.
  expect(predictedMatches).toBeGreaterThan(0);
});

it('rankShot_ordersMatchAboveRunAboveMissAboveLonePacketAboveBreach', (): void => {
  const value = (patch: Partial<ShotValue>): ShotValue => ({
    score: 0,
    run: 0,
    hit: true,
    breached: false,
    ...patch,
  });
  const ranks = [
    value({ score: 30 }),
    value({ run: 2 }),
    value({ hit: false }),
    value({ run: 1 }),
    value({ breached: true }),
  ].map(rankShot);

  expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
  expect(new Set(ranks).size).toBe(ranks.length);
});
