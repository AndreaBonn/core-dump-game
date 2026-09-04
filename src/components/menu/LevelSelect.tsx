import { Button } from '@/components/shared/Button';
import { TOTAL_LEVELS } from '@/config/levels';
import { isLevelUnlocked, starsOf } from '@/engine/core/progress';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, index) => index + 1);

/** Three slots, filled or hollow, so the rating reads without colour alone. */
function Stars({ earned }: { earned: number }) {
  return (
    <span aria-hidden className="text-xs tracking-widest text-terminal-accent">
      {'*'.repeat(earned)}
      <span className="text-terminal-border">{'.'.repeat(3 - earned)}</span>
    </span>
  );
}

export function LevelSelect() {
  const setScreen = useGameStore((state) => state.setScreen);
  const startGame = useGameStore((state) => state.startGame);
  const progress = useProgressStore((state) => state.progress);

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">Campaign</h1>
      <p className="font-mono text-sm text-terminal-muted">
        Clear a level to unlock the next one. Replaying can only improve its rating.
      </p>

      <ol className="grid grid-cols-2 gap-3">
        {LEVELS.map((level) => {
          const unlocked = isLevelUnlocked(progress, level);
          const stars = starsOf(progress, level);
          return (
            <li key={level}>
              <Button
                variant={stars > 0 ? 'primary' : 'ghost'}
                className="flex w-full flex-col gap-1"
                disabled={!unlocked}
                aria-label={
                  unlocked
                    ? `Level ${level}, ${stars} of 3 stars`
                    : `Level ${level}, locked. Clear level ${level - 1} first.`
                }
                onClick={() => startGame('campaign', level)}
              >
                <span>{unlocked ? `Level ${level}` : `Level ${level} [locked]`}</span>
                {unlocked && <Stars earned={stars} />}
              </Button>
            </li>
          );
        })}
      </ol>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
      </Button>
    </main>
  );
}
