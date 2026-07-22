import { create } from 'zustand';
import type { RunMode } from '@/engine/core/runController';
import type { ComboLabel, PacketType } from '@/types/game.types';

export type Screen = 'menu' | 'game' | 'leaderboard' | 'settings';
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
  score: number;
  level: number;
  combo: ComboLabel | null;
  powerUp: string | null;
  nextPacket: PacketType | null;
  levelResult: LevelResult | null;
  gameResult: GameResult | null;

  setScreen: (screen: Screen) => void;
  startGame: (mode?: RunMode) => void;
  setScore: (score: number) => void;
  setLevel: (level: number) => void;
  setCombo: (combo: ComboLabel | null) => void;
  setPowerUp: (powerUp: string | null) => void;
  setNextPacket: (nextPacket: PacketType | null) => void;
  reportLevelComplete: (levelScore: number, bonus: number) => void;
  advanceLevel: () => void;
  reportGameOver: (finalScore: number, levelReached: number) => void;
  reportGameWon: (finalScore: number, levelReached: number) => void;
  setStatus: (status: GameStatus) => void;
}

const initialRun = {
  status: 'playing' as GameStatus,
  mode: 'campaign' as RunMode,
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
  startGame: (mode = 'campaign') => set({ screen: 'game', ...initialRun, mode }),
  setScore: (score) => set({ score }),
  setLevel: (level) => set({ level }),
  setCombo: (combo) => set({ combo }),
  setPowerUp: (powerUp) => set({ powerUp }),
  setNextPacket: (nextPacket) => set({ nextPacket }),
  reportLevelComplete: (levelScore, bonus) =>
    set({ status: 'levelComplete', levelResult: { levelScore, bonus } }),
  advanceLevel: () => set({ status: 'playing', levelResult: null, combo: null }),
  reportGameOver: (finalScore, levelReached) =>
    set({ status: 'gameOver', gameResult: { finalScore, levelReached, won: false } }),
  reportGameWon: (finalScore, levelReached) =>
    set({ status: 'gameWon', gameResult: { finalScore, levelReached, won: true } }),
  setStatus: (status) => set({ status }),
}));
