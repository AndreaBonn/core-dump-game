import { FIXED_TIMESTEP } from '@/config/constants';
import type { LevelConfig } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { starsFor, type Stars } from '@/engine/core/stars';
import { LevelSession, type SessionEvent } from '@/engine/LevelSession';
import { chooseShot, FIRE_INTERVAL_SECONDS, type SkillLevel } from './bot';

export const MAX_PLAYTEST_SECONDS = 300;
const MAX_STEPS = Math.floor(MAX_PLAYTEST_SECONDS / FIXED_TIMESTEP);
const FIRE_INTERVAL_STEPS = Math.round(FIRE_INTERVAL_SECONDS / FIXED_TIMESTEP);

export interface PlaytestResult {
  level: number;
  chapter: number | null;
  isBoss: boolean;
  outcome: 'cleared' | 'breached' | 'timeout';
  seconds: number;
  shots: number;
  score: number;
  stars: Stars;
  waves: number;
}

interface SimulationTotals {
  readonly outcome: PlaytestResult['outcome'];
  readonly score: number;
  readonly waves: number;
}

function collectEvent(totals: SimulationTotals, event: SessionEvent): SimulationTotals {
  if (event.kind === 'shot') return { ...totals, score: totals.score + event.outcome.score };
  if (event.kind === 'wave') return { ...totals, waves: totals.waves + 1 };
  if (event.kind === 'cleared' || event.kind === 'breached') {
    return { ...totals, outcome: event.kind };
  }
  return totals;
}

function buildResult(
  config: LevelConfig,
  totals: SimulationTotals,
  progress: { readonly steps: number; readonly shots: number },
): PlaytestResult {
  return {
    level: config.level,
    chapter: config.chapter,
    isBoss: config.isBoss,
    ...totals,
    seconds: progress.steps * FIXED_TIMESTEP,
    shots: progress.shots,
    stars: starsFor(totals.score, config.starThresholds),
  };
}

/** Simulate a seeded level at fixed timestep; score excludes presentation-layer clear bonuses. */
export function runLevel(config: LevelConfig, skill: SkillLevel): PlaytestResult {
  const session = new LevelSession(config);
  let totals: SimulationTotals = { outcome: 'timeout', score: 0, waves: 1 };
  let shots = 0;
  let steps = 0;
  while (steps < MAX_STEPS && totals.outcome === 'timeout') {
    const canFire = steps > 0 && steps % FIRE_INTERVAL_STEPS === 0;
    const choice = canFire ? chooseShot(session, skill, shots) : null;
    if (choice) {
      if (choice.shouldSwap) session.swap();
      session.aim(choice.aimPoint);
      session.fire();
      shots += 1;
    }
    totals = session.step(FIXED_TIMESTEP, colorForType).reduce(collectEvent, totals);
    steps += 1;
  }
  return buildResult(config, totals, { steps, shots });
}
