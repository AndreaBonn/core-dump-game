import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLevel, type ReversalSchedule } from '@/config/levels';
import * as mechanics from '@/engine/systems/MechanicRenderer';
import { GameEngine } from '@/engine/GameEngine';
import type { LevelSession } from '@/engine/LevelSession';
import { createCanvasMock } from '../helpers/canvasMock';
import { createNoopEngineEvents } from '../helpers/engineEvents';

const schedule = { period: 8, duration: 1.5, factor: -0.5 };
const STEP = 0.125;
const SPEED = 20;
interface ReversalInternals {
  session: LevelSession;
  fixedUpdate: (dt: number) => void;
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
  const before = internals.session.chain.frontDistance;
  internals.fixedUpdate(STEP);
  return internals.session.chain.frontDistance - before;
}

afterEach(() => engine?.destroy());

describe('GameEngine reversal', () => {
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
