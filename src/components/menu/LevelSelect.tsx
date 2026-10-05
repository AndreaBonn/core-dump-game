import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">{t('levelSelect.title')}</h1>
      <p className="font-mono text-sm text-terminal-muted">{t('levelSelect.hint')}</p>

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
                    ? t('levelSelect.levelAria', { level, count: stars })
                    : t('levelSelect.levelLockedAria', { level, previous: level - 1 })
                }
                onClick={() => startGame('campaign', level)}
              >
                <span>
                  {unlocked
                    ? t('levelSelect.level', { level })
                    : t('levelSelect.levelLocked', { level })}
                </span>
                {unlocked && <Stars earned={stars} />}
              </Button>
            </li>
          );
        })}
      </ol>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        {t('common.back')}
      </Button>
    </main>
  );
}
