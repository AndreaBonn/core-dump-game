import { useTranslation } from 'react-i18next';
import { CosmeticPicker } from '@/components/menu/CosmeticPicker';
import { RankPanel } from '@/components/menu/RankPanel';
import { Button } from '@/components/shared/Button';
import { TOTAL_LEVELS } from '@/config/levels';
import { totalStars } from '@/engine/core/progress';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-terminal-border py-2 last:border-b-0">
      <dt className="font-mono text-xs uppercase text-terminal-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-terminal-text">{value}</dd>
    </div>
  );
}

export function Profile() {
  const setScreen = useGameStore((state) => state.setScreen);
  const stats = useProgressStore((state) => state.stats);
  const progress = useProgressStore((state) => state.progress);
  const clearProfile = useProgressStore((state) => state.clearProfile);
  const { t } = useTranslation();

  const played = stats.runsPlayed > 0;

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">{t('profile.title')}</h1>

      {played ? (
        <>
          <RankPanel />

          <dl className="rounded-sm border border-terminal-border bg-terminal-panel px-4 py-2">
            <Row label={t('profile.runsPlayed')} value={stats.runsPlayed} />
            <Row label={t('profile.campaignsCompleted')} value={stats.runsWon} />
            <Row label={t('profile.levelsCleared')} value={stats.levelsCleared} />
            <Row
              label={t('profile.stars')}
              value={`${totalStars(progress)} / ${TOTAL_LEVELS * 3}`}
            />
            <Row
              label={t('profile.bestCombo')}
              value={stats.bestCombo > 0 ? t('common.multiplier', { value: stats.bestCombo }) : '-'}
            />
            <Row label={t('profile.powerUpsTriggered')} value={stats.powerUpsTriggered} />
          </dl>

          <dl className="rounded-sm border border-terminal-border bg-terminal-panel px-4 py-2">
            <Row label={t('profile.bestCampaign')} value={stats.bestScore.campaign} />
            <Row label={t('profile.bestEndless')} value={stats.bestScore.endless} />
            <Row label={t('profile.bestDaily')} value={stats.bestScore.daily} />
            <Row label={t('profile.deepestEndless')} value={stats.bestLevel.endless || '-'} />
          </dl>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              if (window.confirm(t('profile.eraseConfirm'))) {
                clearProfile();
              }
            }}
          >
            {t('profile.erase')}
          </Button>
        </>
      ) : (
        <div className="rounded-sm border border-terminal-border bg-terminal-panel p-6 text-center">
          <p className="mb-2 font-mono text-terminal-text">{t('profile.emptyTitle')}</p>
          <p className="mb-4 font-mono text-sm text-terminal-muted">{t('profile.emptyBody')}</p>
          <Button onClick={() => useGameStore.getState().startGame('campaign')}>
            {t('profile.playFirst')}
          </Button>
        </div>
      )}

      <CosmeticPicker />

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        {t('common.back')}
      </Button>
    </main>
  );
}
