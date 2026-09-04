import { create } from 'zustand';
import type { RunMode } from '@/engine/core/runController';
import type { ComboLabel, PacketType, RunResult } from '@/types/game.types';

export type Screen =
  | 'menu'
  | 'game'
  | 'levels'
  | 'leaderboard'
  | 'settings'
  | 'profile'
  | 'achievements';
export type GameStatus = 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'gameWon';

export interface LevelResult {
  levelScore: number;
  bonus: number;
}

export interface GameResult {
  finalScore: number;
  levelReached: number;
  won: boolean;
}

interface GameUIState {
  screen: Screen;
  status: GameStatus;
  mode: RunMode;
  /** Level the current run was started from, so a retry resumes there. */
  startLevel: number;
  score: number;
  level: number;
  combo: ComboLabel | null;
  powerUp: string | null;
  nextPacket: PacketType | null;
  levelResult: LevelResult | null;
  gameResult: GameResult | null;

  setScreen: (screen: Screen) => void;
  startGame: (mode?: RunMode, startLevel?: number) => void;
  setScore: (score: number) => void;
  setLevel: (level: number) => void;
  setCombo: (combo: ComboLabel | null) => void;
  setPowerUp: (powerUp: string | null) => void;
  setNextPacket: (nextPacket: PacketType | null) => void;
  reportLevelComplete: (levelScore: number, bonus: number) => void;
  advanceLevel: () => void;
  reportRunEnd: (result: RunResult) => void;
  setStatus: (status: GameStatus) => void;
}

const initialRun = {
  status: 'playing' as GameStatus,
  mode: 'campaign' as RunMode,
  startLevel: 1,
  score: 0,
  level: 1,
  combo: null,
  powerUp: null,
  nextPacket: null,
  levelResult: null,
  gameResult: null,
};

export const useGameStore = create<GameUIState>((set) => ({
  screen: 'menu',
  ...initialRun,

  setScreen: (screen) => set({ screen }),
  startGame: (mode = 'campaign', startLevel = 1) =>
    set({ screen: 'game', ...initialRun, mode, level: startLevel, startLevel }),
  setScore: (score) => set({ score }),
  setLevel: (level) => set({ level }),
  setCombo: (combo) => set({ combo }),
  setPowerUp: (powerUp) => set({ powerUp }),
  setNextPacket: (nextPacket) => set({ nextPacket }),
  reportLevelComplete: (levelScore, bonus) =>
    set({ status: 'levelComplete', levelResult: { levelScore, bonus } }),
  advanceLevel: () => set({ status: 'playing', levelResult: null, combo: null }),
  reportRunEnd: (result) =>
    set({
      status: result.won ? 'gameWon' : 'gameOver',
      gameResult: { finalScore: result.score, levelReached: result.levelReached, won: result.won },
    }),
  setStatus: (status) => set({ status }),
}));
