import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { deletePersonalScore, isLeaderboardAvailable } from '@/services/leaderboardService';
import type { ScoreMode } from '@/engine/core/runController';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

const SCORED_MODES: readonly ScoreMode[] = ['campaign', 'endless', 'daily'];

type EraseState = 'idle' | 'working' | 'done' | 'error' | 'unavailable';

const ERASE_MESSAGE: Record<EraseState, string> = {
  idle: '',
  working: 'Deleting...',
  done: 'Your scores have been deleted from the leaderboard.',
  error: 'Could not delete them - check your connection and try again.',
  unavailable: 'This build has no online leaderboard, so there is nothing stored online.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-terminal-border bg-terminal-panel p-4">
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
  const [erase, setErase] = useState<EraseState>('idle');

  const eraseOnlineScores = async () => {
    if (!isLeaderboardAvailable()) {
      setErase('unavailable');
      return;
    }
    if (!uid || !window.confirm('Delete your scores from every leaderboard?')) {
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
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">Privacy</h1>

      <Section title="on this device">
        <p>
          Your progress, stars, statistics, achievements, nickname and sound setting are stored in
          this browser and never leave it. Clearing your browser data removes them.
        </p>
      </Section>

      <Section title="on the leaderboard">
        <p>
          If you save a score, three things are sent: the nickname you type, the score and the level
          you reached, plus the time of the save and an anonymous account id created for this
          browser. No email, no name, no account.
        </p>
        <p className="text-terminal-muted">
          The nickname is shown publicly to everyone who opens the leaderboard. Do not use your real
          name.
        </p>
      </Section>

      <Section title="how long it is kept">
        <p>
          A saved score stays until you delete it. Only your best score per mode is kept: a new
          personal best replaces the previous one.
        </p>
      </Section>

      <Section title="deleting it">
        <p>You can remove everything, at any time, without asking anyone.</p>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={() => void eraseOnlineScores()} disabled={erase === 'working'}>
            Delete my online scores
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm('Erase your progress, stars and achievements on this device?')) {
                clearProfile();
              }
            }}
          >
            Erase this device
          </Button>
        </div>
        {ERASE_MESSAGE[erase] && (
          <p role="status" className="pt-1 text-xs text-terminal-muted">
            {ERASE_MESSAGE[erase]}
          </p>
        )}
      </Section>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('settings')}>
        Back
      </Button>
    </main>
  );
}
