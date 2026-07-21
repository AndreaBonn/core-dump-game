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
}

export function createPacket({
  type,
  distance,
  powerUpType = null,
}: CreatePacketOptions): DataPacket {
  return {
    id: nextPacketId++,
    type,
    distance,
    isPowerUp: powerUpType !== null,
    powerUpType,
  };
}
