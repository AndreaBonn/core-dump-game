import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/Button';
import { deletePersonalScore, isLeaderboardAvailable } from '@/services/leaderboardService';
import type { ScoreMode } from '@/engine/core/runController';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const SCORED_MODES: readonly ScoreMode[] = ['campaign', 'endless', 'daily'];

type EraseState = 'idle' | 'working' | 'done' | 'error' | 'unavailable';

const ERASE_MESSAGE_KEY = {
  working: 'privacy.eraseWorking',
  done: 'privacy.eraseDone',
  error: 'privacy.eraseError',
  unavailable: 'privacy.eraseUnavailable',
} as const satisfies Record<Exclude<EraseState, 'idle'>, string>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-terminal-border bg-terminal-panel p-4">
      <h2 className="mb-2 font-mono text-sm uppercase tracking-widest text-terminal-accent">
        {title}
      </h2>
      <div className="space-y-2 font-mono text-sm text-terminal-text">{children}</div>
    </section>
  );
}

export function Privacy() {
  const setScreen = useGameStore((state) => state.setScreen);
  const uid = useAuthStore((state) => state.uid);
  const clearProfile = useProgressStore((state) => state.clearProfile);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const [erase, setErase] = useState<EraseState>('idle');
  const { t } = useTranslation();

  const eraseOnlineScores = async () => {
    if (!isLeaderboardAvailable()) {
      setErase('unavailable');
      return;
    }
    if (!uid || !window.confirm(t('privacy.deleteOnlineConfirm'))) {
      return;
    }
    setErase('working');
    try {
      await Promise.all(SCORED_MODES.map((mode) => deletePersonalScore(uid, mode)));
      setErase('done');
    } catch {
      setErase('error');
    }
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">{t('privacy.title')}</h1>

      <Section title={t('privacy.onDeviceTitle')}>
        <p>{t('privacy.onDeviceBody')}</p>
      </Section>

      <Section title={t('privacy.onLeaderboardTitle')}>
        <p>{t('privacy.onLeaderboardBody')}</p>
        <p className="text-terminal-muted">{t('privacy.onLeaderboardWarning')}</p>
      </Section>

      <Section title={t('privacy.retentionTitle')}>
        <p>{t('privacy.retentionBody')}</p>
      </Section>

      <Section title={t('privacy.deletingTitle')}>
        <p>{t('privacy.deletingBody')}</p>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={() => void eraseOnlineScores()} disabled={erase === 'working'}>
            {t('privacy.deleteOnline')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // "Everything" has to mean everything: progress, statistics and
              // achievements, and the preferences too, nickname included.
              if (window.confirm(t('privacy.eraseDeviceConfirm'))) {
                clearProfile();
                resetSettings();
              }
            }}
          >
            {t('privacy.eraseDevice')}
          </Button>
        </div>
        {erase !== 'idle' && (
          <p role="status" className="pt-1 text-xs text-terminal-muted">
            {t(ERASE_MESSAGE_KEY[erase])}
          </p>
        )}
      </Section>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('settings')}>
        {t('common.back')}
      </Button>
    </main>
  );
}
