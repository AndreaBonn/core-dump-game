import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { achievementById } from '@/engine/core/achievements';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

/** How long a single unlock stays on screen before it steps aside. */
const VISIBLE_MS = 3500;

/**
 * Announces one unlocked achievement at a time, oldest first. A status rather
 * than an alert: it must not pull focus out of a run in progress.
 */
export function AchievementToast() {
  const pending = useProgressStore((state) => state.pending);
  const dismissPending = useProgressStore((state) => state.dismissPending);
  const current = pending[0];
  // In a run the HUD owns the top row; the board's lower edge is free.
  const placement = useGameStore((state) => state.screen) === 'game' ? 'bottom' : 'top';
  const { t } = useTranslation();

  useEffect(() => {
    if (!current) {
      return;
    }
    const timeout = window.setTimeout(() => dismissPending(current), VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [current, dismissPending]);

  if (!current) {
    return null;
  }
  const achievement = achievementById(current);
  if (!achievement) {
    return null;
  }

  return (
    <div
      role="status"
      data-placement={placement}
      className={`pointer-events-none absolute inset-x-0 ${placement === 'bottom' ? 'bottom-3' : 'top-3'} z-500 mx-auto w-fit max-w-[90%] rounded-sm border border-terminal-accent bg-terminal-panel px-4 py-2 text-center font-mono shadow-lg`}
    >
      <p className="text-xs uppercase tracking-widest text-terminal-muted">
        {t('achievements.toast')}
      </p>
      <p className="text-terminal-accent">{t(`achievements.items.${achievement.id}.name`)}</p>
    </div>
  );
}
