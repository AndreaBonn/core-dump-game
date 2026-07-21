import { useMemo, useState } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { createNoopEngineEvents } from '@/engine/events';

function App() {
  const [gameOver, setGameOver] = useState(false);

  const events = useMemo(
    () => ({
      ...createNoopEngineEvents(),
      onGameOver: () => setGameOver(true),
    }),
    [],
  );

  return (
    <main className="relative h-full w-full">
      <GameCanvas level={1} events={events} />
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-terminal-bg/80">
          <p className="text-2xl font-bold text-packet-error">CORE DUMPED</p>
        </div>
      )}
    </main>
  );
}

export default App;
