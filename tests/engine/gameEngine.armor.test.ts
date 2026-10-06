import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CRACK_SCORE } from '@/config/constants';
import { GameEngine } from '@/engine/GameEngine';
import { Chain } from '@/engine/entities/Chain';
import { createPacket } from '@/engine/entities/DataPacket';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { VoidHole } from '@/engine/entities/VoidHole';
import { vec2 } from '@/engine/math/vec2';
import type { DataPacket, EngineEvents, GamePhase } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';

/** The private surface an armored shot goes through. */
interface EngineInternals {
  phase: GamePhase;
  score: number;
  path: Path;
  chain: Chain;
  voidHole: VoidHole;
  projectiles: Projectile[];
  tryInsert: (projectile: Projectile) => boolean;
}

function spyEvents(): EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>> {
  return {
    onScoreChange: vi.fn(),
    onLevelChange: vi.fn(),
    onComboChange: vi.fn(),
    onNextPacketChange: vi.fn(),
    onLevelComplete: vi.fn(),
    onRunEnd: vi.fn(),
    onPowerUp: vi.fn(),
    onWaveChange: vi.fn(),
  } as EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>>;
}

let engine: GameEngine | null = null;

function boardWith(events: EngineEvents, packets: DataPacket[]): EngineInternals {
  engine = new GameEngine(createCanvasMock(), events);
  engine.resize(960, 600, 1);
  const internals = engine as unknown as EngineInternals;
  internals.path = new Path([vec2(0, 0), vec2(600, 0)]);
  internals.chain = new Chain(packets, 100);
  internals.voidHole = new VoidHole(vec2(600, 0), internals.path.length);
  internals.projectiles = [];
  internals.phase = 'playing';
  internals.score = 0;
  return internals;
}

describe('GameEngine with armored packets', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    engine?.destroy();
    engine = null;
    vi.unstubAllGlobals();
  });

  it('credits the crack score when a shot only cracks an armored run', () => {
    const events = spyEvents();
    const internals = boardWith(events, [
      createPacket({ type: 'ERROR', distance: 200, armor: 1 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);

    internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

    expect(internals.score).toBe(CRACK_SCORE);
    expect(events.onScoreChange).toHaveBeenCalledWith(CRACK_SCORE);
    expect(events.onComboChange).not.toHaveBeenCalled();
    expect(internals.chain.packets).toHaveLength(3);
  });

  it('explodes the cracked run on the next matching shot', () => {
    const events = spyEvents();
    const internals = boardWith(events, [
      createPacket({ type: 'SUCCESS', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200, armor: 1 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

    internals.tryInsert(new Projectile(vec2(220, 0), 0, 'ERROR'));

    expect(internals.chain.packets.map((packet) => packet.type)).toEqual(['SUCCESS']);
    expect(internals.score).toBeGreaterThan(CRACK_SCORE);
  });
});
