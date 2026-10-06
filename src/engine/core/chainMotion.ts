import type { ReversalSchedule } from '@/config/levels';

// A short lead gives time to read the direction cue before aiming at the moving chain.
const TELEGRAPH_SECONDS = 0.75;

/** Returns the speed factor at elapsed level seconds; the first window opens at period. */
export function directionFactor(elapsed: number, schedule: ReversalSchedule | null): number {
  if (!schedule || elapsed < schedule.period) {
    return 1;
  }
  return elapsed % schedule.period < schedule.duration ? schedule.factor : 1;
}

/**
 * Returns the next front distance. Backward motion stops at the path entrance
 * and never moves a front that is already behind it (a rollback can put it
 * there): clamping to 0 would pull that chain forward. Forward motion is free.
 */
export function reversalStep(frontDistance: number, delta: number): number {
  const next = frontDistance + delta;
  return delta < 0 ? Math.max(Math.min(frontDistance, 0), next) : next;
}

/** Returns a linear prewarning phase, held at one during reversal so its direction remains legible. */
export function telegraphPhase(elapsed: number, schedule: ReversalSchedule | null): number {
  if (!schedule) return 0;
  const cycleTime = elapsed % schedule.period;
  if (elapsed >= schedule.period && cycleTime < schedule.duration) return 1;
  const untilReversal = schedule.period - cycleTime;
  return Math.max(0, 1 - untilReversal / TELEGRAPH_SECONDS);
}
