import { useEffect } from 'react';
import { achievementById } from '@/engine/core/achievements';
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
      className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit max-w-[90%] rounded border border-terminal-accent bg-terminal-panel px-4 py-2 text-center font-mono shadow-lg"
    >
      <p className="text-xs uppercase tracking-widest text-terminal-muted">achievement unlocked</p>
      <p className="text-terminal-accent">{achievement.name}</p>
    </div>
  );
}
