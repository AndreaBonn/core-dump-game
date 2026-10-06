import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { COSMETICS, type CosmeticItem, type CosmeticSlot } from '@/config/cosmetics';
import {
  cosmeticStateFor,
  isUnlocked,
  resolveSelection,
  type CosmeticState,
} from '@/engine/core/cosmeticUnlocks';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const SLOTS: readonly CosmeticSlot[] = ['cursor', 'chain', 'palette'];

/** What a locked item asks for, in the player's words; null when nothing is asked. */
function useUnlockText(): (item: CosmeticItem) => string | null {
  const { t } = useTranslation();
  return (item) => {
    const { unlock } = item;
    switch (unlock.kind) {
      case 'rank':
        return t('profile.cosmetics.unlock.rank', { rank: unlock.rank });
      case 'stars':
        return t('profile.cosmetics.unlock.stars', { stars: unlock.stars });
      case 'bosses':
        return t('profile.cosmetics.unlock.bosses', { bosses: unlock.bosses });
      default:
        return null;
    }
  };
}

interface SlotGroupProps {
  slot: CosmeticSlot;
  selected: string;
  state: CosmeticState;
}

function SlotGroup({ slot, selected, state }: SlotGroupProps) {
  const { t } = useTranslation();
  const unlockText = useUnlockText();
  const selectCosmetic = useSettingsStore((store) => store.selectCosmetic);
  return (
    <fieldset className="flex flex-col gap-1 border-b border-terminal-border py-2 last:border-b-0">
      <legend className="font-mono text-xs uppercase text-terminal-muted">
        {t(`profile.cosmetics.slots.${slot}`)}
      </legend>
      {COSMETICS.filter((item) => item.slot === slot).map((item) => {
        const locked = !isUnlocked(item, state);
        const hint = locked ? unlockText(item) : null;
        return (
          <label
            key={item.id}
            className={`flex min-h-11 items-center gap-3 font-mono text-sm ${locked ? 'text-terminal-muted' : 'text-terminal-text'}`}
          >
            <input
              type="radio"
              name={`cosmetic-${slot}`}
              value={item.id}
              checked={selected === item.id}
              disabled={locked}
              onChange={() => selectCosmetic(slot, item.id)}
              className="h-4 w-4 accent-terminal-accent"
            />
            <span>{t(`profile.cosmetics.items.${item.id}`)}</span>
            {hint && <span className="ml-auto text-xs">{hint}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

/** Pick a cursor, a chain shape and a palette; locked items say how to earn them. */
export function CosmeticPicker() {
  const { t } = useTranslation();
  const stats = useProgressStore((store) => store.stats);
  const progress = useProgressStore((store) => store.progress);
  const earned = useProgressStore((store) => store.earned);
  const cosmetics = useSettingsStore((store) => store.cosmetics);
  const state = useMemo(
    () => cosmeticStateFor({ stats, progress, earned }),
    [stats, progress, earned],
  );
  // Show what the board actually draws: a locked choice reads as its default.
  const selection = resolveSelection(
    cosmetics,
    COSMETICS.filter((item) => isUnlocked(item, state)),
  );

  return (
    <section className="rounded-sm border border-terminal-border bg-terminal-panel px-4 py-2">
      <h2 className="py-1 font-mono text-sm font-bold text-terminal-text">
        {t('profile.cosmetics.title')}
      </h2>
      {SLOTS.map((slot) => (
        <SlotGroup key={slot} slot={slot} selected={selection[slot]} state={state} />
      ))}
    </section>
  );
}
