import { useTranslation } from 'react-i18next';
import { RANK_COUNT } from '@/engine/core/ranks';
import { useMetaProgress } from '@/hooks/useMetaProgress';

const PERCENT = 100;

/** The player's rank, XP and how far they are from the next rank. */
export function RankPanel() {
  const { xp, rank } = useMetaProgress();
  const { t } = useTranslation();
  const isTop = rank.nextThreshold === null;
  // At the top rank the bar is simply full: there is no next mark to count to.
  const max = rank.nextThreshold ?? xp;
  const status = isTop
    ? t('profile.topRank')
    : t('profile.xpProgress', { xp, next: rank.nextThreshold });

  return (
    <section className="rounded-sm border border-terminal-border bg-terminal-panel px-4 py-3 font-mono">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-bold text-terminal-accent">{t(`profile.ranks.${rank.id}`)}</p>
        <p className="shrink-0 text-xs uppercase text-terminal-muted">
          {t('profile.rank', { index: rank.index, total: RANK_COUNT })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('profile.xpBar')}
        aria-valuemin={rank.threshold}
        aria-valuemax={max}
        aria-valuenow={xp}
        aria-valuetext={status}
        className="mt-2 h-2 overflow-hidden rounded-sm bg-terminal-border"
      >
        <div
          className="h-full bg-terminal-trace"
          style={{ width: `${rank.progress * PERCENT}%` }}
        />
      </div>
      <p className="mt-2 flex justify-between gap-3 text-xs tabular-nums text-terminal-muted">
        <span>{status}</span>
        {isTop && <span>{t('profile.xpTotal', { xp })}</span>}
      </p>
    </section>
  );
}
