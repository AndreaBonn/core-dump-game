import { afterEach, beforeEach, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { LevelSession } from '@/engine/LevelSession';
import type { Vec2 } from '@/engine/math/vec2';
import type { DataPacket, EngineEvents, GamePhase } from '@/types/game.types';
import { createCanvasMock } from './canvasMock';
import { straightSession } from './levelSession';

export interface EngineInternals {
  phase: GamePhase;
  score: number;
  level: number;
  levelStartScore: number;
  session: LevelSession;
  aim: (point: Vec2) => void;
  fixedUpdate: (dt: number) => void;
  screenToBoard: (x: number, y: number) => Vec2;
  loop: (now: number) => void;
  fx: { addShake: (magnitude: number) => void; shakeOffset: () => Vec2 };
}

export const engines: GameEngine[] = [];

/** Register and clean up real engine input listeners between tests. */
export function installEngineHooks(): void {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    while (engines.length > 0) engines.pop()!.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}

/** Construct a real engine with a mock canvas and retain it for cleanup. */
export function makeEngine(events: EngineEvents): {
  engine: GameEngine;
  internals: EngineInternals;
} {
  const engine = new GameEngine(createCanvasMock(), events);
  engines.push(engine);
  engine.resize(960, 600, 1);
  return { engine, internals: engine as unknown as EngineInternals };
}

/** Install a public session fixture while retaining engine score and run state. */
export function applyStraightBoard(
  internals: EngineInternals,
  packets: DataPacket[],
  options: { position?: Vec2; speed?: number } = {},
): void {
  internals.session = straightSession(packets, options);
  internals.phase = 'playing';
}
