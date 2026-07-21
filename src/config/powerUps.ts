import { PACKET_SPACING } from '@/config/constants';
import type { PowerUpType } from '@/types/game.types';

export interface PowerUpDefinition {
  readonly type: PowerUpType;
  /** In-game terminal name shown to the player (spec 4.3). */
  readonly name: string;
  /** Single glyph drawn on the power-up packet. */
  readonly glyph: string;
}

export const POWER_UPS: Record<PowerUpType, PowerUpDefinition> = {
  SLEEP: { type: 'SLEEP', name: 'sleep()', glyph: 'z' },
  FORK: { type: 'FORK', name: 'fork()', glyph: 'Y' },
  GARBAGE_COLLECT: { type: 'GARBAGE_COLLECT', name: 'garbage collect', glyph: '#' },
  ROLLBACK: { type: 'ROLLBACK', name: 'rollback()', glyph: '<' },
};

export const POWER_UP_TYPES: readonly PowerUpType[] = Object.keys(POWER_UPS) as PowerUpType[];

/** Seconds the chain stays slowed by `sleep()`. */
export const SLEEP_DURATION = 5;
/** Speed multiplier applied to the chain while `sleep()` is active. */
export const SLEEP_FACTOR = 0.35;
/** Angular spread between the three projectiles produced by `fork()`. */
export const FORK_SPREAD = 0.16;
/** Arc-length the chain retreats when `rollback()` triggers. */
export const ROLLBACK_DISTANCE = PACKET_SPACING * 6;
