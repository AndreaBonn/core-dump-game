import { compactBehind } from '@/engine/core/chainOps';
import {
  KILL_RANGE,
  ROLLBACK_DISTANCE,
  SLEEP_DURATION,
  SLEEP_FACTOR,
} from '@/config/powerUps';
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
  /** Whether the run gains a shield against the next reach of the void. */
  readonly grantsShield: boolean;
}

/** Everything a power-up may read or mutate, without reaching into the engine. */
export interface PowerUpContext {
  packets: DataPacket[];
  rng: Rng;
}

const NO_EFFECT: PowerUpEffect = {
  speedFactor: null,
  sleepSeconds: null,
  armsFork: false,
  grantsShield: false,
};

/**
 * Terminate the `count` packets closest to the void (`kill -9`). Hitting the
 * front is what buys time, and it is the only part of the chain the player
 * cannot always reach with a shot.
 */
export function killRange(packets: DataPacket[], count: number): DataPacket[] {
  const removed = packets.splice(Math.max(0, packets.length - count), count);
  return removed;
}

/** The packet type the chain holds most of, or null on an empty chain. */
export function mostFrequentType(packets: readonly DataPacket[]): PacketType | null {
  const counts = new Map<PacketType, number>();
  for (const packet of packets) {
    counts.set(packet.type, (counts.get(packet.type) ?? 0) + 1);
  }
  let best: PacketType | null = null;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Apply the chain-side part of a power-up and describe the run-side part the
 * caller must apply. Chain mutations happen here; engine state (speed, timers,
 * pending fork) is returned rather than written, so the whole decision stays
 * testable without a live engine.
 */
export function resolvePowerUp(type: PowerUpType, ctx: PowerUpContext): PowerUpEffect {
  switch (type) {
    case 'SLEEP':
      return { ...NO_EFFECT, speedFactor: SLEEP_FACTOR, sleepSeconds: SLEEP_DURATION };
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
    case 'KILL_9':
      killRange(ctx.packets, KILL_RANGE);
      return NO_EFFECT;
    case 'TRY_CATCH':
      return { ...NO_EFFECT, grantsShield: true };
    case 'REGEX': {
      // Unlike garbage collect, which picks at random, regex matches the type
      // the chain holds most of: a bigger, aimed sweep.
      const target = mostFrequentType(ctx.packets);
      if (target) {
        removeAllOfType(ctx.packets, target);
      }
      return NO_EFFECT;
    }
  }
}
