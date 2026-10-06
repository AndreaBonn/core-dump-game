import type { LevelConfig } from '@/config/levels';
import type { Chain } from '@/engine/entities/Chain';
import { nextWave } from '@/engine/core/waves';
import { removeStrandedHazards } from '@/engine/systems/MatchSystem';
import type { DataPacket } from '@/types/game.types';

/** Remove stranded hazards before deciding whether to start another wave or finish the level. */
export function resolveChainCompletion(
  chain: Chain,
  config: LevelConfig,
  currentWave: number,
  effects: {
    onHazard: (hazard: DataPacket) => void;
    onNextWave: (next: NonNullable<ReturnType<typeof nextWave>>) => void;
    onComplete: () => void;
  },
): void {
  for (const hazard of removeStrandedHazards(chain.packets)) {
    effects.onHazard(hazard);
  }
  if (!chain.isEmpty) return;
  const next = nextWave(config, currentWave);
  if (next) effects.onNextWave(next);
  else effects.onComplete();
}
