import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { vec2 } from '@/engine/math/vec2';
import { TOTAL_LEVELS } from '@/config/levels';
import { createCanvasMock } from '../helpers/canvasMock';
import { spyEvents } from '../helpers/engineEvents';
import {
  engines,
  makeEngine,
  installEngineHooks,
  type EngineInternals,
} from '../helpers/gameEngine';

installEngineHooks();

describe('GameEngine', () => {
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
      engine.startLevel(TOTAL_LEVELS - 1);
      internals.phase = 'levelComplete';
      engine.nextLevel();
      expect(internals.level).toBe(TOTAL_LEVELS);
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

    it('refuses a game action before any level is in play, naming the cause', () => {
      const { internals } = makeEngine(spyEvents());

      expect(() => internals.fixedUpdate(0.01)).toThrow('no level in play');
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
      const aimedAngle = internals.session.cursor.angle;
      expect(aimedAngle).toBeCloseTo(0, 1);

      internals.phase = 'paused';
      internals.aim(vec2(300, 600));
      expect(internals.session.cursor.angle).toBe(aimedAngle);
    });

    it('aims the cursor at the board point under a mouse moved over the canvas', () => {
      const listeners = new Map<string, (event: Partial<PointerEvent>) => void>();
      const canvas = createCanvasMock();
      canvas.addEventListener = ((type: string, listener: (event: Partial<PointerEvent>) => void) =>
        listeners.set(type, listener)) as HTMLCanvasElement['addEventListener'];
      const engine = new GameEngine(canvas, spyEvents());
      engines.push(engine);
      engine.resize(960, 600, 1);
      engine.startLevel(1);
      const internals = engine as unknown as EngineInternals;
      const { x, y } = internals.session.cursor.position;

      listeners.get('pointermove')!({ pointerType: 'mouse', clientX: x + 100, clientY: y });

      expect(internals.session.cursor.angle).toBeCloseTo(0, 5);
    });

    it('firing through the Space key launches one projectile and previews the next packet', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);

      events.onNextPacketChange.mockClear();

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(internals.session.projectiles).toHaveLength(1);
      expect(events.onNextPacketChange).toHaveBeenCalledTimes(1);
    });

    it('does not fire on the Space key when the game is not playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(internals.session.projectiles).toHaveLength(0);
      engine.resume();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(internals.session.projectiles).toHaveLength(1);
    });

    it('swaps the ready and preview packets on the S key while playing', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      const readyBefore = internals.session.cursor.currentType;
      const nextBefore = internals.session.cursor.nextType;

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));

      expect(internals.session.cursor.currentType).toBe(nextBefore);
      expect(internals.session.cursor.nextType).toBe(readyBefore);
      expect(events.onNextPacketChange).toHaveBeenLastCalledWith(readyBefore);
    });

    it('does not swap when the game is not playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';
      const readyBefore = internals.session.cursor.currentType;

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));

      expect(internals.session.cursor.currentType).toBe(readyBefore);
      engine.resume();
      const nextBefore = internals.session.nextType;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      expect(internals.session.cursor.currentType).toBe(nextBefore);
      expect(internals.session.nextType).toBe(readyBefore);
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

  describe('fixed-timestep loop', () => {
    it('advances the simulation each frame while playing', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      const before = internals.session.chain.frontDistance;
      (internals as unknown as { lastTime: number; accumulator: number }).lastTime = 0;
      (internals as unknown as { lastTime: number; accumulator: number }).accumulator = 0;

      internals.loop(100);

      expect(internals.session.chain.frontDistance).toBeGreaterThan(before);
      expect(internals.phase).toBe('playing');
    });

    it('does not advance the simulation while paused', () => {
      const { engine, internals } = makeEngine(spyEvents());
      engine.startLevel(1);
      internals.phase = 'paused';
      const before = internals.session.chain.frontDistance;
      (internals as unknown as { lastTime: number; accumulator: number }).lastTime = 0;

      internals.loop(100);

      expect(internals.session.chain.frontDistance).toBe(before);
      internals.phase = 'playing';
      internals.loop(200);
      expect(internals.session.chain.frontDistance).toBeGreaterThan(before);
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
});
