import type { RunMode } from '@/engine/core/runController';

export type PacketType = 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING' | 'DEBUG' | 'TRACE' | 'FATAL';

export type PowerUpType =
  | 'SLEEP'
  | 'FORK'
  | 'GARBAGE_COLLECT'
  | 'ROLLBACK'
  | 'KILL_9'
  | 'TRY_CATCH'
  | 'REGEX';

export interface DataPacket {
  readonly id: number;
  type: PacketType;
  /** Arc-length position of the packet centre along the path, in pixels. */
  distance: number;
  isPowerUp: boolean;
  powerUpType: PowerUpType | null;
  /**
   * False for a hazard packet: it never forms a run and never explodes with
   * one, so it has to be worked around rather than matched away.
   */
  matchable: boolean;
}

export type GamePhase = 'idle' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'gameWon';

/** How a run ended, whatever the mode and whatever ended it. */
export interface RunResult {
  readonly mode: RunMode;
  readonly score: number;
  /** Highest level the run reached, 1-based. */
  readonly levelReached: number;
  /** Score earned inside the last level, for star thresholds. */
  readonly levelScore: number;
  /** True when the run reached the final level of a bounded mode. */
  readonly won: boolean;
}

export interface ComboLabel {
  multiplier: number;
  text: string;
}

/** Discrete events emitted by the engine to the React/UI layer. */
export interface EngineEvents {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onComboChange: (combo: ComboLabel | null) => void;
  onNextPacketChange: (type: PacketType | null) => void;
  onLevelComplete: (levelScore: number, bonus: number) => void;
  /** Fired once when a run ends, in victory or defeat. */
  onRunEnd: (result: RunResult) => void;
  onPowerUp: (type: PowerUpType) => void;
}
