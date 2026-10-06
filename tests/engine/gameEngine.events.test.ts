import { describe, expect, it, vi } from 'vitest';
import { audioManager } from '@/engine/audio/AudioManager';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { FIXED_TIMESTEP, LEVEL_CLEAR_BONUS } from '@/config/constants';
import { TOTAL_LEVELS } from '@/config/levels';
import { SHIELD_ROLLBACK } from '@/config/powerUps';
import { spyEvents } from '../helpers/engineEvents';
import { makeEngine, installEngineHooks, applyStraightBoard } from '../helpers/gameEngine';
import { BASE_SPEED, powerUpSession } from '../helpers/levelSession';

installEngineHooks();

describe('GameEngine event delivery', () => {
  describe('projectile insertion and matching', () => {
    it('applies a power-up carried by a matched packet', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216, powerUpType: 'SLEEP' }),
      ]);
      internals.session.fire();
      internals.fixedUpdate(0);
      expect(events.onPowerUp).toHaveBeenCalledWith('SLEEP');
      expect(internals.session.chain.speed).toBeCloseTo(35);
    });

    it('clears a matched run, scores it and reports the new score', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'SUCCESS', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
      ]);
      internals.score = 0;

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.score).toBe(30);
      expect(events.onScoreChange).toHaveBeenCalledWith(30);
      expect(events.onComboChange).not.toHaveBeenCalled();
      expect(internals.session.chain.packets.map((p) => p.type)).toEqual(['SUCCESS']);
    });

    it('emits a combo label when compaction chains a second explosion', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(
        internals,
        [
          createPacket({ type: 'SUCCESS', distance: 100 }),
          createPacket({ type: 'SUCCESS', distance: 132 }),
          createPacket({ type: 'ERROR', distance: 200 }),
          createPacket({ type: 'ERROR', distance: 232 }),
          createPacket({ type: 'SUCCESS', distance: 300 }),
        ],
        { position: vec2(240, 0) },
      );
      internals.score = 0;
      internals.levelStartScore = 0;

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(events.onComboChange).toHaveBeenCalledWith({ multiplier: 2, id: 'segfault' });
    });

    it('lodges a non-matching packet without scoring', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [
        createPacket({ type: 'INFO', distance: 100 }),
        createPacket({ type: 'ERROR', distance: 200 }),
      ]);
      internals.score = 0;

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.score).toBe(0);
      expect(events.onScoreChange).not.toHaveBeenCalled();
      expect(internals.session.chain.packets).toHaveLength(3);
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

      internals.session.fire();
      internals.fixedUpdate(0);

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

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.phase).toBe('gameWon');
      expect(events.onRunEnd).toHaveBeenCalledWith({
        mode: 'campaign',
        score: 30 + LEVEL_CLEAR_BONUS,
        levelReached: TOTAL_LEVELS,
        levelScore: 30,
        won: true,
      });
    });
  });

  describe('level completion around hazards and power-ups', () => {
    it('detonates the hazards and completes the level when only hazards are left', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
        createPacket({ type: 'INFO', distance: 300, matchable: false }),
      ]);
      internals.score = 0;
      internals.levelStartScore = 0;

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.session.chain.isEmpty).toBe(true);
      expect(internals.phase).toBe('levelComplete');
      expect(events.onLevelComplete).toHaveBeenCalledWith(30, LEVEL_CLEAR_BONUS);
    });

    it('keeps playing when a hazard is left next to a matchable packet', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200 }),
        createPacket({ type: 'ERROR', distance: 216 }),
        createPacket({ type: 'INFO', distance: 300, matchable: false }),
        createPacket({ type: 'SUCCESS', distance: 316 }),
      ]);

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.session.chain.packets.map((packet) => packet.matchable)).toEqual([
        false,
        true,
      ]);
      expect(internals.phase).toBe('playing');
      expect(events.onLevelComplete).not.toHaveBeenCalled();
    });

    it('completes the level when a released power-up empties the chain', () => {
      const events = spyEvents();
      const { engine, internals } = makeEngine(events);
      engine.startLevel(1);
      applyStraightBoard(internals, [
        createPacket({ type: 'ERROR', distance: 200, powerUpType: 'KILL_9' }),
        createPacket({ type: 'ERROR', distance: 216 }),
        createPacket({ type: 'INFO', distance: 300 }),
        createPacket({ type: 'SUCCESS', distance: 316 }),
      ]);

      internals.session.fire();
      internals.fixedUpdate(0);

      expect(internals.session.chain.isEmpty).toBe(true);
      expect(internals.phase).toBe('levelComplete');
    });
  });

  describe('game over', () => {
    it('shoves the chain back instead of ending the run when a try/catch shield is up', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      internals.session = powerUpSession('TRY_CATCH', [
        createPacket({ type: 'INFO', distance: 100 }),
      ]);
      internals.phase = 'playing';
      internals.session.fire();
      internals.fixedUpdate(0);
      const play = vi.spyOn(audioManager, 'play');
      const shake = vi.spyOn(internals.fx, 'addShake');
      const { session } = internals;

      internals.fixedUpdate((session.path.length - session.chain.frontDistance) / BASE_SPEED);

      expect(internals.phase).toBe('playing');
      expect(events.onRunEnd).not.toHaveBeenCalled();
      expect(session.chain.packets[0]!.distance).toBeCloseTo(session.path.length - SHIELD_ROLLBACK);
      expect(shake).toHaveBeenCalledWith(16);
      expect(play).toHaveBeenCalledWith('powerup');
    });

    it('ends the run on the second reach of the void, the shield being spent', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      internals.session = powerUpSession('TRY_CATCH', [
        createPacket({ type: 'INFO', distance: 100 }),
      ]);
      internals.phase = 'playing';
      internals.session.fire();
      internals.fixedUpdate(0);
      const { session } = internals;
      internals.fixedUpdate((session.path.length - session.chain.frontDistance) / BASE_SPEED);
      expect(internals.phase).toBe('playing');
      expect(events.onRunEnd).not.toHaveBeenCalled();

      internals.fixedUpdate(SHIELD_ROLLBACK / BASE_SPEED);

      expect(internals.phase).toBe('gameOver');
      expect(events.onRunEnd).toHaveBeenCalledTimes(1);
    });

    it('ends the game when the chain front reaches the void', () => {
      const events = spyEvents();
      const { internals } = makeEngine(events);
      applyStraightBoard(internals, [createPacket({ type: 'INFO', distance: 0 })]);
      internals.session.chain.speed = 0;
      internals.session.chain.packets[0]!.distance = internals.session.path.length;
      internals.session.fire();

      internals.fixedUpdate(FIXED_TIMESTEP);

      expect(internals.phase).toBe('gameOver');
      expect(events.onRunEnd).toHaveBeenCalledWith({
        mode: 'campaign',
        score: 0,
        levelReached: internals.level,
        levelScore: 0,
        won: false,
      });
      expect(internals.session.projectiles).toHaveLength(0);
    });
  });
});
