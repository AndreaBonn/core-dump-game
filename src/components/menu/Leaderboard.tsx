import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/Button';
import { isScoredMode, type ScoreMode } from '@/engine/core/runController';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { ScoreEntry } from '@/types/leaderboard.types';

const MODES: readonly ScoreMode[] = ['campaign', 'endless', 'daily'];

export function Leaderboard() {
  const setScreen = useGameStore((state) => state.setScreen);
  const uid = useAuthStore((state) => state.uid);
  const [mode, setMode] = useState<ScoreMode>(() => {
    // The board has nothing to show for the tutorial, so it opens on the
    // campaign instead of on a mode that has no leaderboard.
    const played = useGameStore.getState().mode;
    return isScoredMode(played) ? played : 'campaign';
  });
  const { status, top, personalBest } = useLeaderboard(mode);
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">{t('leaderboard.title')}</h1>

      <div className="flex gap-2" role="group" aria-label={t('leaderboard.modeGroup')}>
        {MODES.map((entry) => (
          <Button
            key={entry}
            variant={entry === mode ? 'primary' : 'ghost'}
            className="flex-1"
            aria-pressed={entry === mode}
            onClick={() => setMode(entry)}
          >
            {t(`leaderboard.${entry}`)}
          </Button>
        ))}
      </div>

      {status === 'ready' ? (
        <ol className="flex flex-col divide-y divide-terminal-border rounded-sm border border-terminal-border">
          {top.length === 0 && (
            <li className="p-4 text-center font-mono text-sm text-terminal-muted">
              {t('leaderboard.empty')}
            </li>
          )}
          {top.map((entry, index) => (
            <Row key={entry.id} rank={index + 1} entry={entry} highlight={entry.userId === uid} />
          ))}
        </ol>
      ) : (
        <p className="font-mono text-sm text-terminal-muted">{t(`leaderboard.${status}`)}</p>
      )}

      {personalBest && (
        <div className="rounded-sm border border-terminal-trace bg-terminal-panel p-3">
          <p className="mb-1 font-mono text-xs uppercase text-terminal-muted">
            {t('leaderboard.yourBest')}
          </p>
          <Row rank={0} entry={personalBest} highlight />
        </div>
      )}

      {status !== 'unavailable' && (
        <p className="font-mono text-xs text-terminal-muted">{t('leaderboard.disclaimer')}</p>
      )}

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        {t('common.back')}
      </Button>
    </main>
  );
}

interface RowProps {
  rank: number;
  entry: ScoreEntry;
  highlight: boolean;
}

function Row({ rank, entry, highlight }: RowProps) {
  const { t } = useTranslation();
  return (
    <li
      className={`flex items-center justify-between gap-3 p-3 font-mono text-sm ${
        highlight ? 'text-terminal-accent' : 'text-terminal-text'
      }`}
    >
      <span className="flex items-center gap-3">
        {rank > 0 && <span className="w-6 tabular-nums text-terminal-muted">{rank}</span>}
        <span className="truncate">{entry.displayName}</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-xs text-terminal-muted">
          {t('leaderboard.levelShort', { level: entry.levelReached })}
        </span>
        <span className="tabular-nums">{entry.score}</span>
      </span>
    </li>
  );
}
