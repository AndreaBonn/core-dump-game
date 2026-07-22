import { comboLabel } from '@/config/combos';
import { insertPacketAt } from '@/engine/core/chainOps';
import { createPacket } from '@/engine/entities/DataPacket';
import type { Vec2 } from '@/engine/math/vec2';
import {
  findCollisionIndex,
  resolveInsertPosition,
  type PathQuery,
} from '@/engine/systems/CollisionSystem';
import { resolveMatches } from '@/engine/systems/MatchSystem';
import type { ComboLabel, DataPacket, PacketType, PowerUpType } from '@/types/game.types';

/** A fired packet resolved against the chain: where it is and what it carries. */
export interface Shot {
  position: Vec2;
  type: PacketType;
}

/** What a shot did to the chain, without touching score, audio or engine state. */
export interface ShotOutcome {
  /** Whether the shot collided with the chain and was inserted. */
  hit: boolean;
  /** Points awarded by the matches this shot triggered. */
  score: number;
  /** Number of consecutive explosions; 0 when nothing matched. */
  explosions: number;
  /** Combo label for two or more explosions, otherwise null. */
  combo: ComboLabel | null;
  /** Power-up types released by removed packets, in removal order. */
  powerUps: PowerUpType[];
  /** True when the shot emptied the chain. */
  clearedChain: boolean;
}

function miss(): ShotOutcome {
  return { hit: false, score: 0, explosions: 0, combo: null, powerUps: [], clearedChain: false };
}

/**
 * Resolve a fired packet against the chain: find the collision, splice the
 * packet in, and cascade any matches. Mutates `packets` in place (like the
 * chain ops it composes) and returns a description of the result, leaving
 * scoring, audio and power-up application to the caller. Deterministic with
 * respect to engine state: identical inputs yield an identical outcome, which
 * makes the core of the gameplay testable in isolation.
 */
export function applyShot(packets: DataPacket[], path: PathQuery, shot: Shot): ShotOutcome {
  const index = findCollisionIndex(packets, path, shot.position);
  if (index < 0) {
    return miss();
  }
  const position = resolveInsertPosition(packets, path, index, shot.position);
  insertPacketAt(packets, position, createPacket({ type: shot.type, distance: 0 }));
  const resolution = resolveMatches(packets, position);
  if (!resolution) {
    return { hit: true, score: 0, explosions: 0, combo: null, powerUps: [], clearedChain: false };
  }
  const powerUps = resolution.removed
    .filter((packet) => packet.isPowerUp && packet.powerUpType !== null)
    .map((packet) => packet.powerUpType!);
  return {
    hit: true,
    score: resolution.score,
    explosions: resolution.explosions,
    combo: comboLabel(resolution.explosions),
    powerUps,
    clearedChain: packets.length === 0,
  };
}
