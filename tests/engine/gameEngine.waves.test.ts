import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEVEL_CLEAR_BONUS } from '@/config/constants';
import { buildLevelConfig, type LevelConfig } from '@/config/levels';
import { GameEngine } from '@/engine/GameEngine';
import { Chain } from '@/engine/entities/Chain';
import { createPacket } from '@/engine/entities/DataPacket';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { VoidHole } from '@/engine/entities/VoidHole';
import { vec2 } from '@/engine/math/vec2';
import type { EngineEvents, GamePhase } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';
import { createNoopEngineEvents } from '../helpers/engineEvents';

interface EngineInternals {
  levelConfig: LevelConfig;
  currentWave: number;
  chain: Chain;
  path: Path;
  voidHole: VoidHole;
  phase: GamePhase;
  score: number;
  tryInsert: (projectile: Projectile) => boolean;
}

const CONFIG = { ...buildLevelConfig(1, 12345), waves: 3 };
const MATCH_SCORE = 30;
let engine: GameEngine;

function spyEvents(): EngineEvents {
  return {
    ...createNoopEngineEvents(),
    onWaveChange: vi.fn(),
    onLevelComplete: vi.fn(),
    onRunEnd: vi.fn(),
  };
}

function boardWith(events: EngineEvents, config: LevelConfig = CONFIG): EngineInternals {
  engine = new GameEngine(createCanvasMock(), events);
  const internals = engine as unknown as EngineInternals;
  internals.levelConfig = config;
  internals.chain = new Chain([], config.chainSpeed);
  internals.path = new Path([vec2(0, 0), vec2(600, 0)]);
  internals.voidHole = new VoidHole(vec2(600, 0), internals.path.length);
  internals.phase = 'playing';
  return internals;
}

function clearChain(internals: EngineInternals): void {
  internals.chain.packets.splice(
    0,
    internals.chain.packets.length,
    createPacket({ type: 'ERROR', distance: 200 }),
    createPacket({ type: 'ERROR', distance: 216 }),
  );
  expect(internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'))).toBe(true);
}

afterEach(() => engine?.destroy());

describe('GameEngine waves', () => {
  it('refills twice and awards the level bonus only after the third clear', () => {
    const events = spyEvents();
    const internals = boardWith(events);
    const { chain, path } = internals;

    for (const wave of [2, 3]) {
      clearChain(internals);

      expect(internals.chain).toBe(chain);
      expect(internals.path).toBe(path);
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
    expect(internals.chain.packets).toHaveLength(0);
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
    internals.currentWave = 3;

    engine.startLevel(2);

    expect(events.onWaveChange).toHaveBeenLastCalledWith(1, 3);
    expect(internals.currentWave).toBe(1);
    expect(internals.levelConfig).toBe(CONFIG);
    expect(internals.chain.packets).toHaveLength(CONFIG.chainLength);
  });
});
