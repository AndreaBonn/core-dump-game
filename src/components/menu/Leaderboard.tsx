import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { isScoredMode, type ScoreMode } from '@/engine/core/runController';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { ScoreEntry } from '@/types/leaderboard.types';

const STATUS_MESSAGE: Record<string, string> = {
  loading: 'Loading scores...',
  error: 'Could not load the leaderboard.',
  unavailable: 'The online leaderboard is not configured in this build.',
};

const MODES: readonly { mode: ScoreMode; label: string }[] = [
  { mode: 'campaign', label: 'Campaign' },
  { mode: 'endless', label: 'Endless' },
  { mode: 'daily', label: 'Daily' },
];

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

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">Leaderboard</h1>

      <div className="flex gap-2" role="group" aria-label="Leaderboard mode">
        {MODES.map((entry) => (
          <Button
            key={entry.mode}
            variant={entry.mode === mode ? 'primary' : 'ghost'}
            className="flex-1"
            aria-pressed={entry.mode === mode}
            onClick={() => setMode(entry.mode)}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {status === 'ready' ? (
        <ol className="flex flex-col divide-y divide-terminal-border rounded border border-terminal-border">
          {top.length === 0 && (
            <li className="p-4 text-center font-mono text-sm text-terminal-muted">
              No scores yet. Be the first.
            </li>
          )}
          {top.map((entry, index) => (
            <Row key={entry.id} rank={index + 1} entry={entry} highlight={entry.userId === uid} />
          ))}
        </ol>
      ) : (
        <p className="font-mono text-sm text-terminal-muted">{STATUS_MESSAGE[status]}</p>
      )}

      {personalBest && (
        <div className="rounded border border-terminal-trace bg-terminal-panel p-3">
          <p className="mb-1 font-mono text-xs uppercase text-terminal-muted">your best</p>
          <Row rank={0} entry={personalBest} highlight />
        </div>
      )}

      {status !== 'unavailable' && (
        <p className="font-mono text-xs text-terminal-muted">
          Scores are reported by each player&apos;s browser and are not verified. Treat the board as
          a friendly ranking, not a record book.
        </p>
      )}

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
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
        <span className="text-xs text-terminal-muted">lvl {entry.levelReached}</span>
        <span className="tabular-nums">{entry.score}</span>
      </span>
    </li>
  );
}
