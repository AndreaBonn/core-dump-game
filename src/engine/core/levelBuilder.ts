import { type LevelConfig } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { BOARD_CENTER } from '@/config/paths';
import { generateChainPackets } from '@/engine/core/chainOps';
import { Chain } from '@/engine/entities/Chain';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { Path } from '@/engine/entities/Path';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createRng, type Rng } from '@/engine/math/rng';
import type { PacketType } from '@/types/game.types';

/** Everything a level starts with, before the first frame runs. */
export interface LevelState {
  path: Path;
  voidHole: VoidHole;
  chain: Chain;
  cursor: CpuCursor;
  rng: Rng;
  types: readonly PacketType[];
  /** Chain speed before any power-up alters it. */
  baseSpeed: number;
}

/** Draw the next packet type for the cursor from the level's colour set. */
export function drawPacketType(rng: Rng, types: readonly PacketType[]): PacketType {
  return rng.pick(types);
}

/**
 * Build the starting state of a level from its config. The rng is seeded from
 * the config and returned along with the state, so the engine keeps drawing
 * from the same deterministic stream: the chain, then the two cursor packets,
 * then every packet drawn while playing.
 */
export function buildLevelState(config: LevelConfig): LevelState {
  const path = new Path(config.waypoints);
  const rng = createRng(config.seed);
  const types = typesForCount(config.colorCount);
  const chain = new Chain(
    generateChainPackets({
      count: config.chainLength,
      types,
      rng,
      powerUpChance: config.powerUpChance,
      hazardChance: config.hazardChance,
    }),
    config.chainSpeed,
  );
  return {
    path,
    voidHole: new VoidHole(path.voidPosition, path.length),
    chain,
    cursor: new CpuCursor(BOARD_CENTER, drawPacketType(rng, types), drawPacketType(rng, types)),
    rng,
    types,
    baseSpeed: config.chainSpeed,
  };
}
