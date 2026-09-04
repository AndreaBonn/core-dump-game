import { compactBehind } from '@/engine/core/chainOps';
import { ROLLBACK_DISTANCE, SLEEP_DURATION, SLEEP_FACTOR } from '@/config/powerUps';
import type { Rng } from '@/engine/math/rng';
import type { DataPacket, PacketType, PowerUpType } from '@/types/game.types';

/** Distinct packet types currently present in the chain. */
export function presentTypes(packets: readonly DataPacket[]): PacketType[] {
  const seen = new Set<PacketType>();
  for (const packet of packets) {
    seen.add(packet.type);
  }
  return [...seen];
}

/**
 * Remove every packet of `type` from the chain and re-space the survivors,
 * keeping the front anchored (the `garbage collect` power-up). Mutates the
 * chain in place and returns the removed packets.
 */
export function removeAllOfType(packets: DataPacket[], type: PacketType): DataPacket[] {
  const removed: DataPacket[] = [];
  const kept: DataPacket[] = [];
  for (const packet of packets) {
    (packet.type === type ? removed : kept).push(packet);
  }
  packets.length = 0;
  packets.push(...kept);
  if (packets.length > 0) {
    compactBehind(packets, packets.length - 1);
  }
  return removed;
}

/**
 * Move the whole chain backward along the path by `distance` (the `rollback()`
 * power-up). Mutates the chain in place.
 */
export function rollbackChain(packets: readonly DataPacket[], distance: number): void {
  for (const packet of packets) {
    packet.distance -= distance;
  }
}

/** What the engine must change about the run after a power-up fires. */
export interface PowerUpEffect {
  /** Multiplier for the base chain speed, or null to leave the speed alone. */
  readonly speedFactor: number | null;
  /** Seconds the slow-down lasts, or null when the chain is not slowed. */
  readonly sleepSeconds: number | null;
  /** Whether the next shot splits into three projectiles. */
  readonly armsFork: boolean;
}

/** Everything a power-up may read or mutate, without reaching into the engine. */
export interface PowerUpContext {
  packets: DataPacket[];
  rng: Rng;
}

const NO_EFFECT: PowerUpEffect = { speedFactor: null, sleepSeconds: null, armsFork: false };

/**
 * Apply the chain-side part of a power-up and describe the run-side part the
 * caller must apply. Chain mutations happen here; engine state (speed, timers,
 * pending fork) is returned rather than written, so the whole decision stays
 * testable without a live engine.
 */
export function resolvePowerUp(type: PowerUpType, ctx: PowerUpContext): PowerUpEffect {
  switch (type) {
    case 'SLEEP':
      return { speedFactor: SLEEP_FACTOR, sleepSeconds: SLEEP_DURATION, armsFork: false };
    case 'FORK':
      return { ...NO_EFFECT, armsFork: true };
    case 'GARBAGE_COLLECT': {
      const candidates = presentTypes(ctx.packets);
      if (candidates.length > 0) {
        removeAllOfType(ctx.packets, ctx.rng.pick(candidates));
      }
      return NO_EFFECT;
    }
    case 'ROLLBACK':
      rollbackChain(ctx.packets, ROLLBACK_DISTANCE);
      return NO_EFFECT;
  }
}
