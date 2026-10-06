import type { EngineEvents } from '@/types/game.types';
import { vi, type Mock } from 'vitest';

/** Collect engine notifications without coupling tests to their delivery implementation. */
export function spyEvents(): { [K in keyof EngineEvents]: Mock<EngineEvents[K]> } {
  return {
    onScoreChange: vi.fn<EngineEvents['onScoreChange']>(),
    onLevelChange: vi.fn<EngineEvents['onLevelChange']>(),
    onComboChange: vi.fn<EngineEvents['onComboChange']>(),
    onNextPacketChange: vi.fn<EngineEvents['onNextPacketChange']>(),
    onLevelComplete: vi.fn<EngineEvents['onLevelComplete']>(),
    onRunEnd: vi.fn<EngineEvents['onRunEnd']>(),
    onPowerUp: vi.fn<EngineEvents['onPowerUp']>(),
    onWaveChange: vi.fn<EngineEvents['onWaveChange']>(),
  };
}

/** No-op engine event handlers for tests that only assert on specific events. */
export function createNoopEngineEvents(): EngineEvents {
  return {
    onScoreChange: () => {},
    onLevelChange: () => {},
    onComboChange: () => {},
    onNextPacketChange: () => {},
    onLevelComplete: () => {},
    onRunEnd: () => {},
    onPowerUp: () => {},
    onWaveChange: () => {},
  };
}
