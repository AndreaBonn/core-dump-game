import {
  COSMETICS,
  DEFAULT_COSMETICS,
  type CosmeticItem,
  type CosmeticSelection,
  type CosmeticSlot,
} from '@/config/cosmetics';
import { totalStars, type CampaignProgress } from '@/engine/core/progress';
import { rankFor } from '@/engine/core/ranks';
import type { PlayerStats } from '@/engine/core/stats';
import { bossesCleared, xpFor } from '@/engine/core/xp';

export interface CosmeticState {
  readonly rankIndex: number;
  readonly totalStars: number;
  readonly bossesCleared: number;
}

/** Evaluate a catalog requirement against derived profile progress. */
export function isUnlocked(item: CosmeticItem, state: CosmeticState): boolean {
  const { unlock } = item;
  switch (unlock.kind) {
    case 'default':
    case 'always':
      return true;
    case 'rank':
      return state.rankIndex >= unlock.rank;
    case 'stars':
      return state.totalStars >= unlock.stars;
    case 'bosses':
      return state.bossesCleared >= unlock.bosses;
  }
}

/** Return unlocked catalog entries in their original slot/default order. */
export function unlockedCosmetics(state: CosmeticState): readonly CosmeticItem[] {
  return COSMETICS.filter((item) => isUnlocked(item, state));
}

/** Keep a selection only when unlocked in the requested slot; otherwise use its default. */
export function resolveCosmetic(
  slot: CosmeticSlot,
  selectedId: string,
  unlocked: readonly CosmeticItem[],
): string {
  return unlocked.some((item) => item.slot === slot && item.id === selectedId)
    ? selectedId
    : DEFAULT_COSMETICS[slot];
}

/** The player's choice with every slot the profile has not unlocked put back to its default. */
export function resolveSelection(
  selection: CosmeticSelection,
  unlocked: readonly CosmeticItem[],
): CosmeticSelection {
  return {
    cursor: resolveCosmetic('cursor', selection.cursor, unlocked),
    chain: resolveCosmetic('chain', selection.chain, unlocked),
    palette: resolveCosmetic('palette', selection.palette, unlocked),
  };
}

/** Derive cosmetic requirements from the same saved progress used for XP and ranks. */
export function cosmeticStateFor(profile: {
  stats: PlayerStats;
  progress: CampaignProgress;
  earned: readonly string[];
}): CosmeticState {
  return {
    rankIndex: rankFor(xpFor(profile)).index,
    totalStars: totalStars(profile.progress),
    bossesCleared: bossesCleared(profile.progress),
  };
}
