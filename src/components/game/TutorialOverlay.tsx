import { useEffect, useState } from 'react';
import { Button } from '@/components/shared/Button';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

interface Step {
  readonly title: string;
  readonly body: string;
  /** When set, the step clears itself once the player has done the thing. */
  readonly doneWhen?: (state: { score: number }) => boolean;
}

const STEPS: readonly Step[] = [
  {
    title: 'aim and fire',
    body: 'Move the pointer to aim the CPU cursor. Click, or press Space, to fire the packet it is holding. On a phone, tap where you want to shoot.',
  },
  {
    title: 'match three',
    body: 'Land three packets of the same type in a row and they are cleared. The dotted line shows where your shot will end up.',
    doneWhen: ({ score }) => score > 0,
  },
  {
    title: 'swap the queue',
    body: 'The HUD shows the packet coming next. Right-click, or press S, to swap it with the one you are holding.',
  },
  {
    title: 'hold the line',
    body: 'The chain flows toward /dev/null at the centre. Clear it before it gets there. Clearing a whole level in one go is worth a bonus.',
  },
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
      aria-label="Tutorial"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[300] flex justify-center p-4"
    >
      <div className="pointer-events-auto w-full max-w-md rounded border border-terminal-trace bg-terminal-panel/95 p-4 font-mono shadow-lg">
        <p className="text-xs uppercase tracking-widest text-terminal-muted">
          step {index + 1} of {STEPS.length}
        </p>
        <p className="mt-1 text-terminal-accent">{step.title}</p>
        <p className="mt-2 text-sm text-terminal-text">{step.body}</p>

        <div className="mt-4 flex gap-2">
          {!step.doneWhen && (
            <Button className="flex-1" onClick={() => setIndex(index + 1)}>
              Got it
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={finish}>
            Skip tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}
