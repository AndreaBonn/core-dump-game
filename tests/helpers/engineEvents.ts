import type { EngineEvents } from '@/types/game.types';

/** No-op engine event handlers for tests that only assert on specific events. */
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
