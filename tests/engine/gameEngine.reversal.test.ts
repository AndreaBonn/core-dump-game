import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLevel, type ReversalSchedule } from '@/config/levels';
import { SLEEP_FACTOR } from '@/config/powerUps';
import * as mechanics from '@/engine/systems/MechanicRenderer';
import { GameEngine } from '@/engine/GameEngine';
import type { Chain } from '@/engine/entities/Chain';
import type { PowerUpType } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';
import { createNoopEngineEvents } from '../helpers/engineEvents';

const schedule = { period: 8, duration: 1.5, factor: -0.5 };
const STEP = 0.125;
const SPEED = 20;
interface ReversalInternals {
  chain: Chain;
  fixedUpdate: (dt: number) => void;
  applyPowerUp: (type: PowerUpType) => void;
}
let engine: GameEngine;

function createEngine(reversal: ReversalSchedule | null = schedule): ReversalInternals {
  engine = new GameEngine(createCanvasMock(), createNoopEngineEvents());
  engine.startRun({
    mode: 'campaign',
    startIndex: 1,
    finalLevel: 3,
    levelProvider: (level) => ({
      ...getLevel(1)!,
      level,
      chainSpeed: SPEED,
      chainLength: 3,
      reversal: level === 3 ? null : reversal,
    }),
  });
  return engine as unknown as ReversalInternals;
}

function advanceTo(internals: ReversalInternals, elapsed: number): void {
  for (let time = 0; time < elapsed; time += STEP) internals.fixedUpdate(STEP);
}

function nextDistanceDelta(internals: ReversalInternals): number {
  const before = internals.chain.frontDistance;
  internals.fixedUpdate(STEP);
  return internals.chain.frontDistance - before;
}

afterEach(() => engine?.destroy());

describe('GameEngine reversal', () => {
  it('moves backward inside the window and forward before and after it', () => {
    const internals = createEngine();
    expect(nextDistanceDelta(internals)).toBe(SPEED * STEP);
    advanceTo(internals, 7.75);
    expect(nextDistanceDelta(internals)).toBe(SPEED * STEP * -0.5);
    expect(nextDistanceDelta(internals)).toBe(SPEED * STEP * -0.5);
    advanceTo(internals, 1.25);
    expect(nextDistanceDelta(internals)).toBe(SPEED * STEP);
  });

  it('keeps forward motion for null schedules at the same elapsed time', () => {
    const reversing = createEngine();
    advanceTo(reversing, 8);
    expect(nextDistanceDelta(reversing)).toBe(-1.25);
    engine.destroy();
    const forward = createEngine(null);
    advanceTo(forward, 8);
    expect(nextDistanceDelta(forward)).toBe(2.5);
  });

  it('restarts the reversal clock when rebuilding the level', () => {
    const internals = createEngine();
    advanceTo(internals, 8);
    expect(nextDistanceDelta(internals)).toBe(-1.25);
    engine.startLevel(2);
    expect(nextDistanceDelta(internals)).toBe(2.5);
    advanceTo(internals, 7.875);
    expect(nextDistanceDelta(internals)).toBe(-1.25);
  });

  it('replaces the previous schedule when entering a level without reversal', () => {
    const internals = createEngine();
    advanceTo(internals, 8);
    expect(nextDistanceDelta(internals)).toBe(-1.25);
    engine.startLevel(3);
    advanceTo(internals, 8);
    expect(nextDistanceDelta(internals)).toBe(2.5);
  });

  it('composes reversal with the SLEEP speed multiplier', () => {
    const internals = createEngine();
    advanceTo(internals, 8);
    internals.applyPowerUp('SLEEP');
    expect(nextDistanceDelta(internals)).toBeCloseTo(SPEED * STEP * -0.5 * SLEEP_FACTOR);
  });
});

describe('GameEngine reversal presentation', () => {
  it('passes the warning to the canvas and freezes only its animation for reduced motion', () => {
    const draw = vi.spyOn(mechanics, 'drawReversal');
    const internals = createEngine();
    advanceTo(internals, 7.625);
    engine.resize(960, 600, 1);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 0.5);
    engine.setReducedMotion(true);
    engine.resize(960, 600, 1);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 1);
    internals.fixedUpdate(STEP);
    engine.resize(960, 600, 1);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 1);
    draw.mockRestore();
  });
});
