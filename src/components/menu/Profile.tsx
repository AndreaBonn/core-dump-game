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

  const played = stats.runsPlayed > 0;

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">Profile</h1>

      {played ? (
        <>
          <dl className="rounded border border-terminal-border bg-terminal-panel px-4 py-2">
            <Row label="runs played" value={stats.runsPlayed} />
            <Row label="campaigns completed" value={stats.runsWon} />
            <Row label="levels cleared" value={stats.levelsCleared} />
            <Row label="stars" value={`${totalStars(progress)} / ${TOTAL_LEVELS * 3}`} />
            <Row label="best combo" value={stats.bestCombo > 0 ? `x${stats.bestCombo}` : '-'} />
            <Row label="power-ups triggered" value={stats.powerUpsTriggered} />
          </dl>

          <dl className="rounded border border-terminal-border bg-terminal-panel px-4 py-2">
            <Row label="best campaign" value={stats.bestScore.campaign} />
            <Row label="best endless" value={stats.bestScore.endless} />
            <Row label="best daily" value={stats.bestScore.daily} />
            <Row label="deepest endless level" value={stats.bestLevel.endless || '-'} />
          </dl>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              if (window.confirm('Erase your progress, stars and achievements on this device?')) {
                clearProfile();
              }
            }}
          >
            Erase local progress
          </Button>
        </>
      ) : (
        <div className="rounded border border-terminal-border bg-terminal-panel p-6 text-center">
          <p className="mb-2 font-mono text-terminal-text">No runs recorded yet</p>
          <p className="mb-4 font-mono text-sm text-terminal-muted">
            Statistics appear here once you have played. Nothing is uploaded: this profile stays on
            this device.
          </p>
          <Button onClick={() => useGameStore.getState().startGame('campaign')}>
            Play a first run
          </Button>
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
      </Button>
    </main>
  );
}
