import { Button } from '@/components/shared/Button';
import { useGameStore } from '@/store/useGameStore';

export function Leaderboard() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-terminal-accent">Leaderboard</h1>
      <p className="font-mono text-sm text-terminal-muted">
        The online leaderboard is not configured in this build.
      </p>
      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
      </Button>
    </main>
  );
}
