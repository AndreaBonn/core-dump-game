import { useEffect, useRef } from 'react';
import { GameEngine } from '@/engine/GameEngine';
import { audioManager } from '@/engine/audio/AudioManager';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const forward: EngineEvents = {
      onScoreChange: (value) => eventsRef.current.onScoreChange(value),
      onLevelChange: (value) => eventsRef.current.onLevelChange(value),
      onComboChange: (value) => eventsRef.current.onComboChange(value),
      onNextPacketChange: (value) => eventsRef.current.onNextPacketChange(value),
      onLevelComplete: (score, bonus) => eventsRef.current.onLevelComplete(score, bonus),
      onGameOver: (score, reached) => eventsRef.current.onGameOver(score, reached),
      onGameWon: (score, reached) => eventsRef.current.onGameWon(score, reached),
      onPowerUp: (type) => eventsRef.current.onPowerUp(type),
    };

    audioManager.load();
    const engine = new GameEngine(canvas, forward);
    const applySize = () => {
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    applySize();
    engine.startRun();
    engine.start();
    onReadyRef.current(engine);

    const observer = new ResizeObserver(applySize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      engine.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full touch-none">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
