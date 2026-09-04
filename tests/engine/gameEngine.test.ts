import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { Chain } from '@/engine/entities/Chain';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { FIXED_TIMESTEP, LEVEL_CLEAR_BONUS } from '@/config/constants';
import { SLEEP_DURATION, SLEEP_FACTOR, ROLLBACK_DISTANCE } from '@/config/powerUps';
import { TOTAL_LEVELS } from '@/config/levels';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { DataPacket, EngineEvents, GamePhase, PowerUpType } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';

/** Private surface of GameEngine that the tests drive directly. */
interface EngineInternals {
  phase: GamePhase;
  score: number;
  level: number;
  levelStartScore: number;
  baseSpeed: number;
  sleepTimer: number;
  pendingFork: boolean;
  path: Path;
  chain: Chain;
  voidHole: VoidHole;
  cursor: CpuCursor;
  projectiles: Projectile[];
  fire: () => void;
  aim: (point: { x: number; y: number }) => void;
  tryInsert: (projectile: Projectile) => boolean;
  fixedUpdate: (dt: number) => void;
  updateProjectiles: (dt: number) => void;
  updateSleep: (dt: number) => void;
  applyPowerUp: (type: PowerUpType) => void;
  screenToBoard: (x: number, y: number) => { x: number; y: number };
  loop: (now: number) => void;
  fx: { addShake: (m: number) => void; shakeOffset: () => { x: number; y: number } };
}

function spyEvents(): EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>> {
  return {
    onScoreChange: vi.fn(),
    onLevelChange: vi.fn(),
    onComboChange: vi.fn(),
    onNextPacketChange: vi.fn(),
    onLevelComplete: vi.fn(),
    onGameOver: vi.fn(),
    onGameWon: vi.fn(),
    onPowerUp: vi.fn(),
  } as EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>>;
}

const engines: GameEngine[] = [];

function makeEngine(events: EngineEvents): {
  engine: GameEngine;
  internals: EngineInternals;
} {
  const engine = new GameEngine(createCanvasMock(), events);
  engines.push(engine);
  engine.resize(960, 600, 1);
  return { engine, internals: engine as unknown as EngineInternals };
}

/** Replace the board with a straight, predictable track carrying `packets`. */
function applyStraightBoard(
  internals: EngineInternals,
  packets: DataPacket[],
  baseSpeed = 100,
): void {
  internals.path = new Path([vec2(0, 0), vec2(600, 0)]);
  internals.chain = new Chain(packets, baseSpeed);
  internals.baseSpeed = baseSpeed;
  internals.voidHole = new VoidHole(vec2(600, 0), internals.path.length);
  internals.projectiles = [];
  internals.phase = 'playing';
}

describe('GameEngine', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    while (engines.length > 0) {
      engines.pop()!.destroy();
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('run and level lifecycle', () => {
    it('startRun resets the score to zero and starts at level 1', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      internals.score = 999;

      engine.startRun();

      expect(events.onScoreChange).toHaveBeenCalledWith(0);
      expect(events.onLevelChange).toHaveBeenCalledWith(1);
      expect(internals.level).toBe(1);
      expect(internals.score).toBe(0);
      expect(internals.phase).toBe('playing');
    });

    it('nextLevel advances only from a completed level below the last', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(3);

      internals.phase = 'playing';
      engine.nextLevel();
      expect(internals.level).toBe(3);

      internals.phase = 'levelComplete';
      engine.nextLevel();
      expect(internals.level).toBe(4);
      expect(events.onLevelChange).toHaveBeenLastCalledWith(4);
    });

    it('nextLevel does nothing past the final level', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(TOTAL_LEVELS);
      internals.phase = 'levelComplete';
      engine.nextLevel();
      expect(internals.level).toBe(TOTAL_LEVELS);
    });

    it('pause and resume only toggle between playing and paused', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);

      engine.pause();
      expect(internals.phase).toBe('paused');
      engine.resume();
      expect(internals.phase).toBe('playing');

      internals.phase = 'gameOver';
      engine.pause();
      expect(internals.phase).toBe('gameOver');
      engine.resume();
      expect(internals.phase).toBe('gameOver');
    });

    it('throws when the canvas exposes no 2D context', () => {
      const canvas = {
        getContext: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as HTMLCanvasElement;
      expect(() => new GameEngine(canvas, spyEvents())).toThrow(
        '2D canvas context is not available',
      );
    });

    it('start is idempotent while the loop is already running', () => {
      const raf = vi.fn(() => 1);
      vi.stubGlobal('requestAnimationFrame', raf);
      vi.stubGlobal('cancelAnimationFrame', () => {});
      const { engine } = makeEngine(spyEvents());

      engine.start();
      const callsAfterFirstStart = raf.mock.calls.length;
      engine.start();

      expect(raf.mock.calls.length).toBe(callsAfterFirstStart);
    });

    it('cancels the pending animation frame on destroy while the loop is running', () => {
      const cancel = vi.fn();
      vi.stubGlobal('requestAnimationFrame', () => 1);
      vi.stubGlobal('cancelAnimationFrame', cancel);
      const { engine } = makeEngine(spyEvents());

      engine.start();
      engine.destroy();

      expect(cancel).toHaveBeenCalled();
    });
  });

  describe('aiming and firing', () => {
    it('aims the cursor toward a point only while playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);

      internals.aim(vec2(600, 300));
      const aimedAngle = internals.cursor.angle;
      expect(aimedAngle).toBeCloseTo(0, 1);

      internals.phase = 'paused';
      internals.aim(vec2(300, 600));
      expect(internals.cursor.angle).toBe(aimedAngle);
    });

    it('firing through the Space key launches one projectile and previews the next packet', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      internals.projectiles = [];
      events.onNextPacketChange.mockClear();

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(internals.projectiles).toHaveLength(1);
      expect(events.onNextPacketChange).toHaveBeenCalledTimes(1);
    });

    it('does not fire on the Space key when the game is not playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';
      internals.projectiles = [];

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(internals.projectiles).toHaveLength(0);
    });

    it('splits the next shot into three projectiles while a fork is pending', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.projectiles = [];
      internals.pendingFork = true;

      internals.fire();

      expect(internals.projectiles).toHaveLength(3);
      expect(internals.pendingFork).toBe(false);
    });

    it('swaps the ready and preview packets on the S key while playing', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      const readyBefore = internals.cursor.currentType;
      const nextBefore = internals.cursor.nextType;

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));

      expect(internals.cursor.currentType).toBe(nextBefore);
      expect(internals.cursor.nextType).toBe(readyBefore);
      expect(events.onNextPacketChange).toHaveBeenLastCalledWith(readyBefore);
    });

    it('does not swap when the game is not playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';
      const readyBefore = internals.cursor.currentType;

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));

      expect(internals.cursor.currentType).toBe(readyBefore);
    });
  });

  describe('coordinate mapping', () => {
    it('maps the centre of a landscape viewport to the centre of the board', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.resize(1280, 800, 1);
      // scale 4/3, no letterboxing: (640,400) screen is the middle of the board.
      expect(internals.screenToBoard(640, 400)).toEqual({ x: 480, y: 300 });
    });

    it('maps the centre of a portrait viewport to the centre of the board', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.resize(480, 600, 1);
      // Portrait fits the content box, not the 960x600 board, so the scale is
      // set by the box; the centre still maps to the centre.
      const centre = internals.screenToBoard(240, 300);
      expect(centre.x).toBeCloseTo(480);
      expect(centre.y).toBeCloseTo(300);
    });

    it('keeps the game larger in portrait than fitting the whole board would', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.resize(375, 700, 1);

      // 100 CSS px to the right of centre covers fewer board units than the
      // 100 / (375/960) the old whole-board fit would have covered.
      const centre = internals.screenToBoard(187.5, 350);
      const offset = internals.screenToBoard(287.5, 350);
      expect(offset.x - centre.x).toBeLessThan(100 / (375 / 960));
    });
  });

  describe('projectile insertion and matching', () => {
    it('clears a matched run, scores it and reports the new score', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'SUCCESS', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ]);
      internals.score = 0;

      const inserted = internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

      expect(inserted).toBe(true);
      expect(internals.score).toBe(30);
      expect(events.onScoreChange).toHaveBeenCalledWith(30);
      expect(events.onComboChange).not.toHaveBeenCalled();
      expect(internals.chain.packets.map((p) => p.type)).toEqual(['SUCCESS']);
    });

    it('emits a combo label when compaction chains a second explosion', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'SUCCESS', distance: 100 }),
        createPacket({ type: 'SUCCESS', distance: 132 }),
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 232 }),
        createPacket({ type: 'SUCCESS', distance: 300 }),
      ]);
      internals.score = 0;
      internals.levelStartScore = 0;

      internals.tryInsert(new Projectile(vec2(240, 0), 0, 'ERROR'));

      expect(events.onComboChange).toHaveBeenCalledWith({ multiplier: 2, text: 'SEGFAULT!' });
    });

    it('returns false and leaves the chain untouched when nothing is hit', () => {
      const { internals } = makeEngine(spyEvents());
      applyStraightBoard(internals, [createPacket({ type: 'INFO', distance: 100 })]);

      const inserted = internals.tryInsert(new Projectile(vec2(500, 0), 0, 'ERROR'));

      expect(inserted).toBe(false);
      expect(internals.chain.packets).toHaveLength(1);
    });

    it('lodges a non-matching packet without scoring', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'INFO', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 200 }),
      ]);
      internals.score = 0;

      const inserted = internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

      expect(inserted).toBe(true);
      expect(internals.score).toBe(0);
      expect(events.onScoreChange).not.toHaveBeenCalled();
      expect(internals.chain.packets).toHaveLength(3);
    });

    it('applies a power-up carried by a matched packet', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(
        internals,
        [
          createPacket({ type: 'ERROR', distance: 200 }),
          createPacket({ type: 'ERROR', distance: 216, powerUpType: 'SLEEP' }),
        ],
        100,
      );

      internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

      expect(events.onPowerUp).toHaveBeenCalledWith('SLEEP');
      expect(internals.sleepTimer).toBe(SLEEP_DURATION);
      expect(internals.chain.speed).toBeCloseTo(100 * SLEEP_FACTOR);
    });
  });

  describe('level completion', () => {
    it('completes the level with the clear bonus when the chain empties below the last level', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ]);
      internals.score = 0;
      internals.levelStartScore = 0;

      internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

      expect(internals.phase).toBe('levelComplete');
      expect(events.onLevelComplete).toHaveBeenCalledWith(30, LEVEL_CLEAR_BONUS);
      expect(internals.score).toBe(30 + LEVEL_CLEAR_BONUS);
    });

    it('wins the game when the final level is cleared', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ]);
      internals.level = TOTAL_LEVELS;
      internals.score = 0;
      internals.levelStartScore = 0;

      internals.tryInsert(new Projectile(vec2(208, 0), 0, 'ERROR'));

      expect(internals.phase).toBe('gameWon');
      expect(events.onGameWon).toHaveBeenCalledWith(30 + LEVEL_CLEAR_BONUS, TOTAL_LEVELS);
    });
  });

  describe('projectile lifetime', () => {
    it('drops projectiles that leave the board and keeps those still inside', () => {
      const { internals } = makeEngine(spyEvents());
      applyStraightBoard(internals, []);
      const inside = new Projectile(vec2(100, 300), 0, 'INFO');
      internals.projectiles = [new Projectile(vec2(5000, 0), 0, 'INFO'), inside];

      internals.updateProjectiles(FIXED_TIMESTEP);

      expect(internals.projectiles).toEqual([inside]);
    });

    it('consumes a projectile once it inserts into the chain', () => {
      const { internals } = makeEngine(spyEvents());
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ]);
      internals.score = 0;
      internals.levelStartScore = 0;
      internals.projectiles = [new Projectile(vec2(200, 0), 0, 'ERROR')];

      internals.updateProjectiles(FIXED_TIMESTEP);

      expect(internals.projectiles).toHaveLength(0);
      expect(internals.chain.isEmpty).toBe(true);
    });
  });

  describe('game over', () => {
    it('ends the game when the chain front reaches the void', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [createPacket({ type: 'INFO', distance: 0 })]);
      internals.chain.speed = 0;
      internals.chain.packets[0]!.distance = internals.path.length;
      internals.projectiles = [new Projectile(vec2(100, 0), 0, 'INFO')];

      internals.fixedUpdate(FIXED_TIMESTEP);

      expect(internals.phase).toBe('gameOver');
      expect(events.onGameOver).toHaveBeenCalledWith(0, internals.level);
      expect(internals.projectiles).toHaveLength(0);
    });
  });

  describe('fixed-timestep loop', () => {
    it('advances the simulation each frame while playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      const before = internals.chain.frontDistance;
      (internals as unknown as { lastTime: number; accumulator: number }).lastTime = 0;
      (internals as unknown as { lastTime: number; accumulator: number }).accumulator = 0;

      internals.loop(100);

      expect(internals.chain.frontDistance).toBeGreaterThan(before);
      expect(internals.phase).toBe('playing');
    });

    it('does not advance the simulation while paused', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';
      const before = internals.chain.frontDistance;
      (internals as unknown as { lastTime: number; accumulator: number }).lastTime = 0;

      internals.loop(100);

      expect(internals.chain.frontDistance).toBe(before);
    });
  });

  describe('reduced motion', () => {
    it('suppresses screen shake once reduced motion is enabled', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.setReducedMotion(true);

      internals.fx.addShake(20);

      expect(internals.fx.shakeOffset()).toEqual({ x: 0, y: 0 });
    });

    it('shakes normally when reduced motion is off', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.setReducedMotion(false);
      internals.fx.addShake(20);
      // A live shake produces a non-zero offset once time advances.
      (internals as unknown as { fx: { update: (dt: number) => void } }).fx.update(0.016);
      const offset = internals.fx.shakeOffset();
      expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0);
    });
  });

  describe('power-up effects', () => {
    function powerUpEngine(packets: DataPacket[]): {
      internals: EngineInternals;
      events: ReturnType<typeof spyEvents>;
    } {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, packets, 100);
      return { internals, events };
    }

    it('FORK arms the next shot to split', () => {
      const { internals, events } = powerUpEngine([]);
      internals.pendingFork = false;
      internals.applyPowerUp('FORK');
      expect(internals.pendingFork).toBe(true);
      expect(events.onPowerUp).toHaveBeenCalledWith('FORK');
    });

    it('SLEEP slows the chain, and updateSleep restores speed when the timer elapses', () => {
      const { internals } = powerUpEngine([createPacket({ type: 'INFO', distance: 0 })]);
      internals.applyPowerUp('SLEEP');
      expect(internals.chain.speed).toBeCloseTo(100 * SLEEP_FACTOR);
      expect(internals.sleepTimer).toBe(SLEEP_DURATION);

      internals.updateSleep(SLEEP_DURATION + 1);
      expect(internals.chain.speed).toBe(100);
    });

    it('GARBAGE_COLLECT removes every packet of one present type', () => {
      const { internals, events } = powerUpEngine([
        createPacket({ type: 'INFO', distance: 0 }),
        createPacket({ type: 'ERROR', distance: 32 }),
        createPacket({ type: 'INFO', distance: 64 }),
      ]);
      internals.applyPowerUp('GARBAGE_COLLECT');
      expect(internals.chain.packets.length).toBeLessThan(3);
      expect(events.onPowerUp).toHaveBeenCalledWith('GARBAGE_COLLECT');
    });

    it('GARBAGE_COLLECT is a no-op on an empty chain', () => {
      const { internals, events } = powerUpEngine([]);
      internals.applyPowerUp('GARBAGE_COLLECT');
      expect(internals.chain.packets).toHaveLength(0);
      expect(events.onPowerUp).toHaveBeenCalledWith('GARBAGE_COLLECT');
    });

    it('ROLLBACK retreats every packet by the rollback distance', () => {
      const { internals } = powerUpEngine([
        createPacket({ type: 'INFO', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 132 }),
      ]);
      internals.applyPowerUp('ROLLBACK');
      expect(internals.chain.packets.map((p) => p.distance)).toEqual([
        100 - ROLLBACK_DISTANCE,
        132 - ROLLBACK_DISTANCE,
      ]);
    });
  });
});
