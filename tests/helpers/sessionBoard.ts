import { buildLevelConfig, type LevelConfig } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { LevelSession, type SessionEvent } from '@/engine/LevelSession';
import { Chain } from '@/engine/entities/Chain';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { Path } from '@/engine/entities/Path';
import { VoidHole } from '@/engine/entities/VoidHole';
import { vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

const TRACK_LENGTH = 600;
const SHOT_DISTANCE = 208;
const CHAIN_SPEED = 100;

/** Build a straight, seeded board with an ERROR shot already touching the chain. */
export function createSessionBoard(
  packets: DataPacket[],
  config: LevelConfig = buildLevelConfig(1, 12345),
): LevelSession {
  const path = new Path([vec2(0, 0), vec2(TRACK_LENGTH, 0)]);
  return LevelSession.fromParts(config, {
    path,
    chain: new Chain(packets, CHAIN_SPEED),
    voidHole: new VoidHole(vec2(TRACK_LENGTH, 0), path.length),
    cursor: new CpuCursor(vec2(SHOT_DISTANCE, 0), 'ERROR', 'ERROR'),
  });
}

/** Fire into the touching chain without advancing its position. */
export function fireSessionShot(session: LevelSession): SessionEvent[] {
  session.cursor.currentType = 'ERROR';
  session.fire();
  return session.step(0, colorForType);
}
