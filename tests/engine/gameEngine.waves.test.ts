import { afterEach, describe, expect, it } from 'vitest';
import { LEVEL_CLEAR_BONUS } from '@/config/constants';
import { buildLevelConfig, type LevelConfig } from '@/config/levels';
import { GameEngine } from '@/engine/GameEngine';
import { LevelSession } from '@/engine/LevelSession';
import { spyEvents } from '../helpers/engineEvents';
import { createSessionBoard } from '../helpers/sessionBoard';
import { createPacket } from '@/engine/entities/DataPacket';
import type { EngineEvents, GamePhase } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';

interface EngineInternals {
  session: LevelSession;
  phase: GamePhase;
  score: number;
  fixedUpdate: (dt: number) => void;
}

const CONFIG = { ...buildLevelConfig(1, 12345), waves: 3 };
const MATCH_SCORE = 30;
let engine: GameEngine;

function boardWith(events: EngineEvents, config: LevelConfig = CONFIG): EngineInternals {
  engine = new GameEngine(createCanvasMock(), events);
  const internals = engine as unknown as EngineInternals;
  internals.session = createSessionBoard([], config);
  internals.phase = 'playing';
  return internals;
}

function clearChain(internals: EngineInternals): void {
  internals.session.chain.packets.splice(
    0,
    internals.session.chain.packets.length,
    createPacket({ type: 'ERROR', distance: 200 }),
    createPacket({ type: 'ERROR', distance: 216 }),
  );
  internals.session.cursor.currentType = 'ERROR';
  internals.session.fire();
  internals.fixedUpdate(0);
}

afterEach(() => engine?.destroy());

describe('GameEngine waves', () => {
  it('refills twice and awards the level bonus only after the third clear', () => {
    const events = spyEvents();
    const internals = boardWith(events);
    const { chain, path } = internals.session;

    for (const wave of [2, 3]) {
      clearChain(internals);

      expect(internals.session.chain).toBe(chain);
      expect(internals.session.path).toBe(path);
      expect(chain.packets).toHaveLength(CONFIG.chainLength);
      expect(events.onWaveChange).toHaveBeenLastCalledWith(wave, 3);
      expect(events.onLevelComplete).not.toHaveBeenCalled();
      expect(internals.phase).toBe('playing');
      expect(internals.score).toBe((wave - 1) * MATCH_SCORE);
    }
    clearChain(internals);

    expect(events.onLevelComplete).toHaveBeenCalledExactlyOnceWith(
      3 * MATCH_SCORE,
      LEVEL_CLEAR_BONUS,
    );
    expect(events.onWaveChange).toHaveBeenCalledTimes(2);
    expect(internals.score).toBe(3 * MATCH_SCORE + LEVEL_CLEAR_BONUS);
    expect(internals.phase).toBe('levelComplete');
    expect(chain.packets).toHaveLength(0);
  });

  it('completes a single-wave level on its first clear', () => {
    const events = spyEvents();
    const internals = boardWith(events, { ...CONFIG, waves: 1 });

    clearChain(internals);

    expect(events.onLevelComplete).toHaveBeenCalledExactlyOnceWith(MATCH_SCORE, LEVEL_CLEAR_BONUS);
    expect(internals.session.chain.packets).toHaveLength(0);
    expect(internals.phase).toBe('levelComplete');
  });

  it('announces the first wave and resets the counter when starting another level', () => {
    const events = spyEvents();
    const internals = boardWith(events);
    engine.startRun({
      mode: 'endless',
      startIndex: 1,
      finalLevel: null,
      levelProvider: () => CONFIG,
    });
    expect(events.onWaveChange).toHaveBeenLastCalledWith(1, 3);
    internals.session = createSessionBoard([], CONFIG);
    clearChain(internals);
    clearChain(internals);
    expect(internals.session.currentWave).toBe(3);

    engine.startLevel(2);

    expect(events.onWaveChange).toHaveBeenLastCalledWith(1, 3);
    expect(internals.session.currentWave).toBe(1);
    expect(internals.session.chain.packets).toHaveLength(CONFIG.chainLength);
  });
});
