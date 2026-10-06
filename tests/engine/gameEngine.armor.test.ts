import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CRACK_SCORE } from '@/config/constants';
import { GameEngine } from '@/engine/GameEngine';
import { LevelSession } from '@/engine/LevelSession';
import { createPacket } from '@/engine/entities/DataPacket';
import type { DataPacket, EngineEvents, GamePhase } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';
import { spyEvents } from '../helpers/engineEvents';
import { createSessionBoard } from '../helpers/sessionBoard';

interface EngineInternals {
  phase: GamePhase;
  score: number;
  session: LevelSession;
  fixedUpdate: (dt: number) => void;
}

let engine: GameEngine | null = null;

function boardWith(events: EngineEvents, packets: DataPacket[]): EngineInternals {
  engine = new GameEngine(createCanvasMock(), events);
  engine.resize(960, 600, 1);
  const internals = engine as unknown as EngineInternals;
  internals.session = createSessionBoard(packets);
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

    internals.session.fire();
    internals.fixedUpdate(0);

    expect(internals.score).toBe(CRACK_SCORE);
    expect(events.onScoreChange).toHaveBeenCalledWith(CRACK_SCORE);
    expect(events.onComboChange).not.toHaveBeenCalled();
    expect(internals.session.chain.packets).toHaveLength(3);
  });

  it('explodes the cracked run on the next matching shot', () => {
    const events = spyEvents();
    const internals = boardWith(events, [
      createPacket({ type: 'SUCCESS', distance: 100 }),
      createPacket({ type: 'ERROR', distance: 200, armor: 1 }),
      createPacket({ type: 'ERROR', distance: 216 }),
    ]);
    internals.session.fire();
    internals.fixedUpdate(0);

    internals.session.fire();
    internals.fixedUpdate(0);

    expect(internals.session.chain.packets.map((packet) => packet.type)).toEqual(['SUCCESS']);
    expect(internals.score).toBeGreaterThan(CRACK_SCORE);
  });
});
