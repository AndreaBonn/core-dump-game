import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';

function state() {
  return useGameStore.getState();
}

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
  });

  it('starts on the menu', () => {
    expect(state().screen).toBe('menu');
  });

  describe('startGame', () => {
    it('opens the game screen on the requested mode', () => {
      state().startGame('endless');

      expect(state().screen).toBe('game');
      expect(state().mode).toBe('endless');
      expect(state().status).toBe('playing');
    });

    it('defaults to the campaign', () => {
      state().startGame();
      expect(state().mode).toBe('campaign');
    });

    it('clears the previous run instead of carrying its result over', () => {
      state().setScore(4200);
      state().reportGameOver(4200, 7);

      state().startGame('daily');

      expect(state().score).toBe(0);
      expect(state().level).toBe(1);
      expect(state().gameResult).toBeNull();
      expect(state().combo).toBeNull();
    });
  });

  describe('run reporting', () => {
    it('records a game over as a run that was not won', () => {
      state().reportGameOver(1500, 4);

      expect(state().status).toBe('gameOver');
      expect(state().gameResult).toEqual({ finalScore: 1500, levelReached: 4, won: false });
    });

    it('records a win as a won run', () => {
      state().reportGameWon(9000, 10);

      expect(state().status).toBe('gameWon');
      expect(state().gameResult).toEqual({ finalScore: 9000, levelReached: 10, won: true });
    });

    it('holds the level result until the player continues', () => {
      state().reportLevelComplete(300, 500);

      expect(state().status).toBe('levelComplete');
      expect(state().levelResult).toEqual({ levelScore: 300, bonus: 500 });

      state().advanceLevel();

      expect(state().status).toBe('playing');
      expect(state().levelResult).toBeNull();
      expect(state().combo).toBeNull();
    });
  });

  describe('engine reporting', () => {
    it('mirrors score, level, combo, power-up and next packet', () => {
      state().setScore(120);
      state().setLevel(3);
      state().setCombo({ multiplier: 2, text: 'SEGFAULT!' });
      state().setPowerUp('sleep()');
      state().setNextPacket('INFO');

      expect(state().score).toBe(120);
      expect(state().level).toBe(3);
      expect(state().combo).toEqual({ multiplier: 2, text: 'SEGFAULT!' });
      expect(state().powerUp).toBe('sleep()');
      expect(state().nextPacket).toBe('INFO');
    });
  });
});
