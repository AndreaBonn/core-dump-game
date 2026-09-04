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
  return {
    id: nextPacketId++,
    type,
    distance,
    isPowerUp: powerUpType !== null,
    powerUpType,
    matchable,
  };
}
