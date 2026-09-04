import type { DataPacket, PacketType, PowerUpType } from '@/types/game.types';

let nextPacketId = 1;

/** Reset the id sequence. Used by tests to keep ids deterministic. */
export function resetPacketIds(): void {
  nextPacketId = 1;
}

export interface CreatePacketOptions {
  type: PacketType;
  distance: number;
  powerUpType?: PowerUpType | null;
  /** Pass false for a hazard packet: it can never take part in a match. */
  matchable?: boolean;
}

export function createPacket({
  type,
  distance,
  powerUpType = null,
  matchable = true,
}: CreatePacketOptions): DataPacket {
  // A hazard carrying a power-up would be a reward for an obstacle, and the
  // player could never collect it anyway since it cannot be matched away. The
  // factory drops it rather than trusting every call site to remember.
  const carried = matchable ? powerUpType : null;
  return {
    id: nextPacketId++,
    type,
    distance,
    isPowerUp: carried !== null,
    powerUpType: carried,
    matchable,
  };
}
