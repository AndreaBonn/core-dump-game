import { useMemo } from 'react';
import { rankFor, type Rank } from '@/engine/core/ranks';
import { xpFor } from '@/engine/core/xp';
import { useProgressStore } from '@/store/useProgressStore';

export interface MetaProgress {
  readonly xp: number;
  readonly rank: Rank;
}

/** Derive XP and rank from the current profile, updating when its source values change. */
export function useMetaProgress(): MetaProgress {
  const stats = useProgressStore((state) => state.stats);
  const progress = useProgressStore((state) => state.progress);
  const earned = useProgressStore((state) => state.earned);

  return useMemo(() => {
    const xp = xpFor({ stats, progress, earned });
    return { xp, rank: rankFor(xp) };
  }, [stats, progress, earned]);
}
