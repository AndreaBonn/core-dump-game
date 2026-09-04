import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { Chain } from '@/engine/entities/Chain';
import { Path } from '@/engine/entities/Path';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createPacket } from '@/engine/entities/DataPacket';
import { Projectile } from '@/engine/entities/Projectile';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { BOARD_CENTER } from '@/config/paths';
import { vec2 } from '@/engine/math/vec2';
import { FIXED_TIMESTEP, HIT_STOP_STEPS } from '@/config/constants';
import { createNoopEngineEvents } from '../helpers/engineEvents';
import { createCanvasMock } from '../helpers/canvasMock';
import type { DataPacket } from '@/types/game.types';

interface Internals {
  phase: string;
  chain: Chain;
  path: Path;
  voidHole: VoidHole;
  projectiles: Projectile[];
  cursor: CpuCursor;
  score: number;
  levelStartScore: number;
  hitStopSteps: number;
  loop: (now: number) => void;
  tryInsert: (projectile: Projectile) => boolean;
  lastTime: number;
  accumulator: number;
}

function engineOn(packets: DataPacket[]): { engine: GameEngine; internals: Internals } {
  const engine = new GameEngine(createCanvasMock(), createNoopEngineEvents());
  engine.resize(960, 600, 1);
  const internals = engine as unknown as Internals;
  internals.path = new Path([vec2(0, 0), vec2(600, 0)]);
  internals.chain = new Chain(packets, 100);
  internals.voidHole = new VoidHole(vec2(600, 0), internals.path.length);
  internals.projectiles = [];
  internals.cursor = new CpuCursor(BOARD_CENTER, 'ERROR', 'INFO');
  internals.phase = 'playing';
  internals.score = 0;
  internals.levelStartScore = 0;
  internals.lastTime = 0;
  internals.accumulator = 0;
  return { engine, internals };
}

/**
 * Two runs of the same type, so one shot clears both and chains a combo. The
 * trailing packet is what keeps the level going: clearing the chain entirely
 * would complete the level and stop the loop, which is not what is under test.
 */
function comboChain(): DataPacket[] {
  return [
    createPacket({ type: 'INFO', distance: 40 }),
    createPacket({ type: 'SUCCESS', distance: 100 }),
    createPacket({ type: 'SUCCESS', distance: 132 }),
    createPacket({ type: 'ERROR', distance: 200 }),
    createPacket({ type: 'ERROR', distance: 232 }),
    createPacket({ type: 'SUCCESS', distance: 300 }),
  ];
}

describe('hit-stop', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is not armed by a shot that only makes one explosion', () => {
    const { engine, internals } = engineOn([
      createPacket({ type: 'ERROR', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 216 }),
      createPacket({ type: 'INFO', distance: 300 }),
    ]);

    internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

    expect(internals.hitStopSteps).toBe(0);
    engine.destroy();
  });

  it('freezes for the number of steps the combo size asks for', () => {
    const { engine, internals } = engineOn(comboChain());

    internals.tryInsert(new Projectile(vec2(240, 0), 0, 'ERROR'));

    expect(internals.hitStopSteps).toBe(HIT_STOP_STEPS[2]);
    engine.destroy();
  });

  it('holds the chain still while frozen, then lets it move again', () => {
    const { engine, internals } = engineOn(comboChain());
    internals.tryInsert(new Projectile(vec2(240, 0), 0, 'ERROR'));
    const frozenSteps = internals.hitStopSteps;
    const before = internals.chain.frontDistance;

    // Exactly the frozen steps worth of time: the chain must not have moved.
    internals.lastTime = 0;
    internals.accumulator = 0;
    internals.loop(frozenSteps * FIXED_TIMESTEP * 1000);

    expect(internals.hitStopSteps).toBe(0);
    expect(internals.chain.frontDistance).toBe(before);

    internals.lastTime = 0;
    internals.loop(FIXED_TIMESTEP * 4 * 1000);

    expect(internals.chain.frontDistance).toBeGreaterThan(before);
    engine.destroy();
  });

  it('keeps the timestep fixed: a freeze skips whole steps, never a partial one', () => {
    const { engine, internals } = engineOn(comboChain());
    internals.tryInsert(new Projectile(vec2(240, 0), 0, 'ERROR'));
    const frozenSteps = internals.hitStopSteps;

    internals.lastTime = 0;
    internals.accumulator = 0;
    // Half a frozen step: not enough to consume one, nothing changes.
    internals.loop(frozenSteps * FIXED_TIMESTEP * 500);

    expect(internals.hitStopSteps).toBeGreaterThan(0);
    expect(internals.hitStopSteps).toBe(Math.ceil(frozenSteps / 2));
    engine.destroy();
  });

  it('is suppressed entirely under reduced motion', () => {
    const { engine, internals } = engineOn(comboChain());
    engine.setReducedMotion(true);

    internals.tryInsert(new Projectile(vec2(240, 0), 0, 'ERROR'));

    expect(internals.hitStopSteps).toBe(0);
    engine.destroy();
  });
});
