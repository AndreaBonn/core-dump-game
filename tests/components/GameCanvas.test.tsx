import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameEngine } from '@/engine/GameEngine';
import { useGameStore } from '@/store/useGameStore';
import type { EngineEvents } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';

/** Resize callbacks registered by the component, so a test can fire one. */
let resizeCallbacks: ResizeObserverCallback[] = [];
let motionListeners: ((event: MediaQueryListEvent) => void)[] = [];
let disconnected = 0;

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      disconnect() {
        disconnected += 1;
      }
      unobserve() {}
    },
  );
}

/** The live media query the component holds; `matches` can be flipped later. */
let motionQuery: { matches: boolean };

function stubMatchMedia(matches: boolean) {
  motionQuery = {
    matches,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      motionListeners.push(listener),
    removeEventListener: () => {},
  } as { matches: boolean };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motionQuery),
  );
}

function spyEvents(): EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>> {
  return {
    onScoreChange: vi.fn(),
    onLevelChange: vi.fn(),
    onComboChange: vi.fn(),
    onNextPacketChange: vi.fn(),
    onLevelComplete: vi.fn(),
    onRunEnd: vi.fn(),
    onPowerUp: vi.fn(),
  } as EngineEvents & Record<keyof EngineEvents, ReturnType<typeof vi.fn>>;
}

describe('GameCanvas', () => {
  beforeEach(() => {
    resizeCallbacks = [];
    motionListeners = [];
    disconnected = 0;
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'game' });
    // jsdom has no 2D context: hand the engine the same no-op surface the
    // engine tests use, so the component runs against the real GameEngine.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createCanvasMock().getContext('2d') as CanvasRenderingContext2D,
    );
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    stubResizeObserver();
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('describes the board and its controls for a player who cannot see it', () => {
    render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);

    const board = screen.getByRole('img');
    expect(board.getAttribute('aria-label')).toMatch(/aim with the pointer/i);
    expect(board.getAttribute('aria-label')).toMatch(/press space to fire/i);
  });

  it('hands the running engine back so the screen can drive it', () => {
    const onReady = vi.fn();

    render(<GameCanvas events={spyEvents()} onReady={onReady} />);

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]![0]).toBeInstanceOf(GameEngine);
  });

  it('starts the run on the mode and level the store holds, not always on level 1', () => {
    useGameStore.setState({ mode: 'campaign', startLevel: 3 });
    const events = spyEvents();

    render(<GameCanvas events={events} onReady={vi.fn()} />);

    expect(events.onLevelChange).toHaveBeenCalledWith(3);
    expect(events.onScoreChange).toHaveBeenCalledWith(0);
  });

  it('sizes the board to its container and resizes with it', () => {
    const resize = vi.spyOn(GameEngine.prototype, 'resize');
    render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);
    const initialCalls = resize.mock.calls.length;
    expect(initialCalls).toBeGreaterThan(0);

    resizeCallbacks[0]!([], {} as ResizeObserver);

    expect(resize.mock.calls.length).toBe(initialCalls + 1);
  });

  it('honours a reduced-motion preference from the start', () => {
    stubMatchMedia(true);
    const setReducedMotion = vi.spyOn(GameEngine.prototype, 'setReducedMotion');

    render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);

    expect(setReducedMotion).toHaveBeenCalledWith(true);
  });

  it('follows the preference when it changes mid-run', () => {
    const setReducedMotion = vi.spyOn(GameEngine.prototype, 'setReducedMotion');
    render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);
    expect(setReducedMotion).toHaveBeenLastCalledWith(false);

    motionQuery.matches = true;
    motionListeners[0]!({} as MediaQueryListEvent);

    expect(setReducedMotion).toHaveBeenLastCalledWith(true);
  });

  it('plays with motion on when the browser cannot report the preference', () => {
    vi.stubGlobal('matchMedia', undefined);
    const setReducedMotion = vi.spyOn(GameEngine.prototype, 'setReducedMotion');

    render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);

    expect(setReducedMotion).toHaveBeenCalledWith(false);
  });

  it('reports to the handlers it holds now, not the ones it mounted with', () => {
    const first = spyEvents();
    const onReady = vi.fn();
    const { rerender } = render(<GameCanvas events={first} onReady={onReady} />);
    const engine = onReady.mock.calls[0]![0] as GameEngine;
    const second = spyEvents();

    rerender(<GameCanvas events={second} onReady={onReady} />);
    engine.startRun();

    expect(second.onScoreChange).toHaveBeenCalledWith(0);
    expect(first.onScoreChange).toHaveBeenCalledTimes(1);
  });

  it('passes every engine event through to the handlers it was given', () => {
    const events = spyEvents();
    const onReady = vi.fn();
    render(<GameCanvas events={events} onReady={onReady} />);
    const engine = onReady.mock.calls[0]![0] as GameEngine;
    // The engine reports through the handler set the canvas built for it.
    const forwarded = (engine as unknown as { events: EngineEvents }).events;

    forwarded.onComboChange({ text: 'CHAIN', multiplier: 3 });
    forwarded.onLevelComplete(800, 250);
    forwarded.onRunEnd({ mode: 'endless', score: 10, levelReached: 2, levelScore: 5, won: false });
    forwarded.onPowerUp('SLEEP');

    expect(events.onComboChange).toHaveBeenCalledWith({ text: 'CHAIN', multiplier: 3 });
    expect(events.onLevelComplete).toHaveBeenCalledWith(800, 250);
    expect(events.onRunEnd).toHaveBeenCalledWith({
      mode: 'endless',
      score: 10,
      levelReached: 2,
      levelScore: 5,
      won: false,
    });
    expect(events.onPowerUp).toHaveBeenCalledWith('SLEEP');
  });

  it('tears the engine and the observer down when the screen goes away', () => {
    const destroy = vi.spyOn(GameEngine.prototype, 'destroy');
    const { unmount } = render(<GameCanvas events={spyEvents()} onReady={vi.fn()} />);

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(disconnected).toBe(1);
  });
});
