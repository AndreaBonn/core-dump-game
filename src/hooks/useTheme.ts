import { useMemo } from 'react';
import {
  cosmeticStateFor,
  resolveSelection,
  unlockedCosmetics,
} from '@/engine/core/cosmeticUnlocks';
import { themeFor, type Theme } from '@/engine/systems/theme';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * The theme the board and the HUD draw with: the player's chosen cosmetics,
 * each kept only while the profile has it unlocked. A choice that a reset took
 * away falls back to its default without being forgotten.
 */
export function useTheme(): Theme {
  const stats = useProgressStore((state) => state.stats);
  const progress = useProgressStore((state) => state.progress);
  const earned = useProgressStore((state) => state.earned);
  const selection = useSettingsStore((state) => state.cosmetics);

  return useMemo(() => {
    const unlocked = unlockedCosmetics(cosmeticStateFor({ stats, progress, earned }));
    return themeFor(resolveSelection(selection, unlocked));
  }, [stats, progress, earned, selection]);
}
