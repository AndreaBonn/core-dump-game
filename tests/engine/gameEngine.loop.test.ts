import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { LevelSession } from '@/engine/LevelSession';
import { createNoopEngineEvents } from '../helpers/engineEvents';
import { createCanvasMock } from '../helpers/canvasMock';

describe('GameEngine fixed-timestep loop', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ends the game exactly once even when many steps accumulate in one frame', () => {
    const events = createNoopEngineEvents();
    const onRunEnd = vi.fn();
    const engine = new GameEngine(createCanvasMock(), { ...events, onRunEnd });
    engine.resize(960, 600, 1);
    engine.startLevel(1);

    // Force the chain front onto the void so every step would end the game.
    const internals = engine as unknown as {
      session: LevelSession;
      lastTime: number;
      accumulator: number;
    };
    const packets = internals.session.chain.packets;
    packets[packets.length - 1]!.distance = internals.session.path.length;
    internals.lastTime = 0;
    internals.accumulator = 0;

    // One frame worth of ~0.25s accumulates dozens of fixed steps.
    (engine as unknown as { loop: (now: number) => void }).loop(500);

    expect(onRunEnd).toHaveBeenCalledTimes(1);
    engine.destroy();
  });
});
