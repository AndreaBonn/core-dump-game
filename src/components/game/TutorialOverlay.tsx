import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/Button';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

interface Step {
  /** Prefix of the `tutorial.<id>Title` / `tutorial.<id>Body` keys. */
  readonly id: 'aim' | 'match' | 'swap' | 'hold';
  /** When set, the step clears itself once the player has done the thing. */
  readonly doneWhen?: (state: { score: number }) => boolean;
}

const STEPS: readonly Step[] = [
  { id: 'aim' },
  { id: 'match', doneWhen: ({ score }) => score > 0 },
  { id: 'swap' },
  { id: 'hold' },
];

/**
 * Teaches the four things the game never says elsewhere. Steps that can be
 * detected clear themselves when the player does them; the rest are dismissed
 * on a button, so the overlay never blocks someone who already knows.
 */
export function TutorialOverlay() {
  const [index, setIndex] = useState(0);
  const score = useGameStore((state) => state.score);
  const setScreen = useGameStore((state) => state.setScreen);
  const markTutorialSeen = useSettingsStore((state) => state.markTutorialSeen);
  const step = STEPS[index];
  const { t } = useTranslation();

  useEffect(() => {
    if (step?.doneWhen?.({ score })) {
      setIndex((current) => current + 1);
    }
  }, [step, score]);

  const finish = () => {
    markTutorialSeen();
    setScreen('menu');
  };

  if (!step) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t('tutorial.label')}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[300] flex justify-center p-4"
    >
      <div className="pointer-events-auto w-full max-w-md rounded border border-terminal-trace bg-terminal-panel/95 p-4 font-mono shadow-lg">
        <p className="text-xs uppercase tracking-widest text-terminal-muted">
          {t('tutorial.step', { current: index + 1, total: STEPS.length })}
        </p>
        <p className="mt-1 text-terminal-accent">{t(`tutorial.${step.id}Title`)}</p>
        <p className="mt-2 text-sm text-terminal-text">{t(`tutorial.${step.id}Body`)}</p>

        <div className="mt-4 flex gap-2">
          {!step.doneWhen && (
            <Button className="flex-1" onClick={() => setIndex(index + 1)}>
              {t('tutorial.gotIt')}
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={finish}>
            {t('tutorial.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
