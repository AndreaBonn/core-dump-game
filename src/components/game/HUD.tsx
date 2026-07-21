import { useEffect } from 'react';
import { colorForType, labelForType } from '@/config/packetTypes';
import { TOTAL_LEVELS } from '@/config/levels';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/shared/Button';

const COMBO_VISIBLE_MS = 1200;

interface HUDProps {
  onPause: () => void;
}

export function HUD({ onPause }: HUDProps) {
  const score = useGameStore((state) => state.score);
  const level = useGameStore((state) => state.level);
  const nextPacket = useGameStore((state) => state.nextPacket);
  const combo = useGameStore((state) => state.combo);
  const setCombo = useGameStore((state) => state.setCombo);
  const powerUp = useGameStore((state) => state.powerUp);
  const setPowerUp = useGameStore((state) => state.setPowerUp);

  useEffect(() => {
    if (!combo) {
      return;
    }
    const timeout = window.setTimeout(() => setCombo(null), COMBO_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [combo, setCombo]);

  useEffect(() => {
    if (!powerUp) {
      return;
    }
    const timeout = window.setTimeout(() => setPowerUp(null), COMBO_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [powerUp, setPowerUp]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[200] flex flex-col p-3 font-mono">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded border border-terminal-border bg-terminal-panel/80 px-3 py-2">
          <p className="text-xs uppercase text-terminal-muted">score</p>
          <p className="text-2xl font-bold text-terminal-accent tabular-nums">{score}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded border border-terminal-border bg-terminal-panel/80 px-3 py-2 text-center">
            <p className="text-xs uppercase text-terminal-muted">level</p>
            <p className="text-lg font-bold text-terminal-text tabular-nums">
              {level}/{TOTAL_LEVELS}
            </p>
          </div>
          {nextPacket && (
            <div className="rounded border border-terminal-border bg-terminal-panel/80 px-3 py-2 text-center">
              <p className="text-xs uppercase text-terminal-muted">next</p>
              <span
                className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded font-bold text-terminal-bg"
                style={{ backgroundColor: colorForType(nextPacket) }}
              >
                {labelForType(nextPacket)}
              </span>
            </div>
          )}
          <Button variant="ghost" className="pointer-events-auto" onClick={onPause}>
            Pause
          </Button>
        </div>
      </div>

      {combo && (
        <div className="mt-10 flex justify-center">
          <p className="animate-pulse text-3xl font-extrabold uppercase tracking-widest text-packet-warning drop-shadow">
            {combo.text} <span className="text-packet-error">x{combo.multiplier}</span>
          </p>
        </div>
      )}

      {powerUp && (
        <div className="mt-4 flex justify-center">
          <p className="rounded bg-terminal-panel/80 px-3 py-1 text-sm font-semibold text-packet-info">
            {powerUp}
          </p>
        </div>
      )}
    </div>
  );
}
