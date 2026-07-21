import type { EngineEvents } from '@/types/game.types';

/** Engine event handlers that do nothing, for callers that only need a subset. */
export function createNoopEngineEvents(): EngineEvents {
  return {
    onScoreChange: () => {},
    onLevelChange: () => {},
    onComboChange: () => {},
    onNextPacketChange: () => {},
    onLevelComplete: () => {},
    onGameOver: () => {},
    onGameWon: () => {},
    onPowerUp: () => {},
  };
}
