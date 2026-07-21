export type PacketType = 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING' | 'DEBUG' | 'TRACE' | 'FATAL';

export type PowerUpType = 'SLEEP' | 'FORK' | 'GARBAGE_COLLECT' | 'ROLLBACK';

export interface DataPacket {
  readonly id: number;
  type: PacketType;
  /** Arc-length position of the packet centre along the path, in pixels. */
  distance: number;
  isPowerUp: boolean;
  powerUpType: PowerUpType | null;
}

export type GamePhase = 'idle' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'gameWon';

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
  onGameOver: (finalScore: number, levelReached: number) => void;
  onGameWon: (finalScore: number, levelReached: number) => void;
  onPowerUp: (type: PowerUpType) => void;
}
