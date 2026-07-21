import { useEffect, useRef } from 'react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2fb344';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#39ff14';
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillText('> canvas online', 24, 40);
  }, []);

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-terminal-accent">
        Core Dump<span className="animate-pulse">_</span>
      </h1>
      <canvas
        ref={canvasRef}
        width={480}
        height={240}
        className="rounded border border-terminal-border"
      />
      <p className="text-sm text-terminal-muted">skeleton online — game slices incoming</p>
    </main>
  );
}

export default App;
