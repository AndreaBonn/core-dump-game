import { Button } from '@/components/shared/Button';
import { ACHIEVEMENTS } from '@/engine/core/achievements';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

export function Achievements() {
  const setScreen = useGameStore((state) => state.setScreen);
  const earned = useProgressStore((state) => state.earned);
  const unlocked = new Set(earned);

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold text-terminal-accent">Achievements</h1>
        <p className="font-mono text-sm tabular-nums text-terminal-muted">
          {unlocked.size}/{ACHIEVEMENTS.length}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id);
          return (
            <li
              key={achievement.id}
              className={`rounded border p-3 font-mono ${
                isUnlocked
                  ? 'border-terminal-trace bg-terminal-panel'
                  : 'border-terminal-border bg-transparent'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className={isUnlocked ? 'text-terminal-accent' : 'text-terminal-muted'}>
                  {achievement.name}
                </p>
                {/* Text, not colour alone: the state has to survive a greyscale screen. */}
                <span className="text-xs uppercase text-terminal-muted">
                  {isUnlocked ? 'unlocked' : 'locked'}
                </span>
              </div>
              <p className="mt-1 text-xs text-terminal-muted">{achievement.description}</p>
            </li>
          );
        })}
      </ul>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
      </Button>
    </main>
  );
}
