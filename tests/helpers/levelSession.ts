import { getLevel } from '@/config/levels';
import { LevelSession } from '@/engine/LevelSession';
import { Chain } from '@/engine/entities/Chain';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { Path } from '@/engine/entities/Path';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createPacket } from '@/engine/entities/DataPacket';
import { vec2, type Vec2 } from '@/engine/math/vec2';
import { DEFAULT_THEME } from '@/engine/systems/theme';
import type { DataPacket, PacketType, PowerUpType } from '@/types/game.types';

export const packetColor = DEFAULT_THEME.packetColor;
export const TRACK_LENGTH = 600;
export const BASE_SPEED = 100;

/** Build a predictable track with a cursor ready to hit the supplied target. */
export function straightSession(
  packets: DataPacket[],
  options: { position?: Vec2; speed?: number; type?: PacketType; nextType?: PacketType } = {},
): LevelSession {
  const speed = options.speed ?? BASE_SPEED;
  const path = new Path([vec2(0, 0), vec2(TRACK_LENGTH, 0)]);
  return LevelSession.fromParts(
    { ...getLevel(1), chainSpeed: speed },
    {
      path,
      chain: new Chain(packets, speed),
      voidHole: new VoidHole(path.voidPosition, path.length),
      cursor: new CpuCursor(
        options.position ?? vec2(208, 0),
        options.type ?? 'ERROR',
        options.nextType ?? 'INFO',
      ),
    },
  );
}

/** Release a power-up through the same match used during ordinary gameplay. */
export function powerUpSession(type: PowerUpType, remaining: DataPacket[]): LevelSession {
  return straightSession(
    [
      createPacket({ type: 'WARNING', distance: 0, powerUpType: type }),
      createPacket({ type: 'WARNING', distance: 32 }),
      ...remaining,
    ],
    { position: vec2(16, 0), type: 'WARNING' },
  );
}
