import { useEffect, useRef } from 'react';
import { GameEngine } from '@/engine/GameEngine';
import type { EngineEvents } from '@/types/game.types';

interface GameCanvasProps {
  level: number;
  events: EngineEvents;
  onReady?: (engine: GameEngine) => void;
}

export function GameCanvas({ level, events, onReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const stableEvents: EngineEvents = {
      onScoreChange: (score) => eventsRef.current.onScoreChange(score),
      onLevelChange: (value) => eventsRef.current.onLevelChange(value),
      onComboChange: (combo) => eventsRef.current.onComboChange(combo),
      onNextPacketChange: (type) => eventsRef.current.onNextPacketChange(type),
      onLevelComplete: (levelScore, bonus) =>
        eventsRef.current.onLevelComplete(levelScore, bonus),
      onGameOver: (finalScore, levelReached) =>
        eventsRef.current.onGameOver(finalScore, levelReached),
      onGameWon: (finalScore, levelReached) =>
        eventsRef.current.onGameWon(finalScore, levelReached),
      onPowerUp: (type) => eventsRef.current.onPowerUp(type),
    };

    const engine = new GameEngine(canvas, stableEvents);
    const applySize = () => {
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    applySize();
    engine.startLevel(level);
    engine.start();
    onReady?.(engine);

    const observer = new ResizeObserver(applySize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      engine.destroy();
    };
  }, [level, onReady]);

  return (
    <div ref={containerRef} className="h-full w-full touch-none">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
