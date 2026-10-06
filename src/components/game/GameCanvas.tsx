import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameEngine } from '@/engine/GameEngine';
import { audioManager } from '@/engine/audio/AudioManager';
import { runConfigForMode } from '@/engine/core/runController';
import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@/store/useGameStore';
import type { EngineEvents } from '@/types/game.types';

interface GameCanvasProps {
  events: EngineEvents;
  onReady: (engine: GameEngine) => void;
}

export function GameCanvas({ events, onReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const theme = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const engineRef = useRef<GameEngine | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const forward: EngineEvents = {
      onScoreChange: (value) => eventsRef.current.onScoreChange(value),
      onLevelChange: (value) => eventsRef.current.onLevelChange(value),
      onWaveChange: (wave, total) => eventsRef.current.onWaveChange(wave, total),
      onComboChange: (value) => eventsRef.current.onComboChange(value),
      onNextPacketChange: (value) => eventsRef.current.onNextPacketChange(value),
      onLevelComplete: (score, bonus) => eventsRef.current.onLevelComplete(score, bonus),
      onRunEnd: (result) => eventsRef.current.onRunEnd(result),
      onPowerUp: (type) => eventsRef.current.onPowerUp(type),
    };

    audioManager.load();
    const engine = new GameEngine(canvas, forward);
    engineRef.current = engine;
    engine.setTheme(themeRef.current);
    const applySize = () => {
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    applySize();

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const applyMotion = () => engine.setReducedMotion(motionQuery?.matches ?? false);
    applyMotion();
    motionQuery?.addEventListener('change', applyMotion);

    const { mode, startLevel } = useGameStore.getState();
    engine.startRun(runConfigForMode(mode, startLevel));
    engine.start();
    onReadyRef.current(engine);

    const observer = new ResizeObserver(applySize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      motionQuery?.removeEventListener('change', applyMotion);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // A cosmetic picked or unlocked mid-run repaints the board without a restart.
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div ref={containerRef} className="h-full w-full touch-none">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label={t('game.canvasLabel')}
        role="img"
      />
    </div>
  );
}
