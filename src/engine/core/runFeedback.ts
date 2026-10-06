import { HIT_STOP_STEPS } from '@/config/constants';
import type { RunConfig } from '@/engine/core/runController';
import type { RunResult } from '@/types/game.types';

/** Returns run metadata with an explicit outcome because the last level can also be lost. */
export function buildRunResult(
  config: RunConfig,
  score: number,
  levelReached: number,
  outcome: Pick<RunResult, 'levelScore' | 'won'>,
): RunResult {
  return { mode: config.mode, score, levelReached, ...outcome };
}

/** Returns the remaining hold, preserving longer cascades and respecting reduced motion. */
export function comboHitStop(current: number, multiplier: number, reducedMotion: boolean): number {
  if (reducedMotion) {
    return current;
  }
  const steps = HIT_STOP_STEPS[Math.min(multiplier, HIT_STOP_STEPS.length - 1)] ?? 0;
  return Math.max(current, steps);
}
