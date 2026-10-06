import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { campaignConfig } from '@/engine/core/runController';
import { EngineRenderer, type Frame } from '@/engine/systems/EngineRenderer';
import type { EngineEvents } from '@/types/game.types';
import { createCanvasMock } from '../helpers/canvasMock';

const FRAME_MS = 1000 / 60;
const AIM_POINTS = [
  [180, 120],
  [780, 120],
  [780, 480],
  [180, 480],
] as const;
const SHOT_INTERVAL = 30;
const FRAME_COUNT = 1800;

function replay(level: number): object {
  const received: unknown[] = [];
  const events: EngineEvents = {
    onScoreChange: (score) => received.push(['score', score]),
    onLevelChange: (value) => received.push(['level', value]),
    onComboChange: (combo) => received.push(['combo', combo]),
    onNextPacketChange: (type) => received.push(['next', type]),
    onLevelComplete: (...args) => received.push(['complete', ...args]),
    onRunEnd: (result) => received.push(['end', result]),
    onPowerUp: (type) => received.push(['powerUp', type]),
    onWaveChange: (...args) => received.push(['wave', ...args]),
  };
  const canvas = createCanvasMock();
  const listeners = new Map<string, EventListener>();
  canvas.addEventListener = ((name: string, listener: EventListener) => {
    listeners.set(name, listener);
  }) as HTMLCanvasElement['addEventListener'];
  return driveReplay({ level, canvas, listeners, events, received });
}

function driveReplay(options: {
  level: number;
  canvas: HTMLCanvasElement;
  listeners: Map<string, EventListener>;
  events: EngineEvents;
  received: unknown[];
}): object {
  let frame: Frame | undefined;
  let tick: FrameRequestCallback = () => {};
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    tick = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(EngineRenderer.prototype, 'present').mockImplementation((_ctx, state) => {
    frame = state;
  });
  const engine = new GameEngine(options.canvas, options.events);
  engine.resize(960, 600, 1);
  engine.startRun(campaignConfig(options.level));
  engine.start();
  for (let index = 1; index <= FRAME_COUNT; index += 1) {
    if (index % SHOT_INTERVAL === 0) fireAt(options.listeners, index / SHOT_INTERVAL);
    tick(index * FRAME_MS);
  }
  engine.destroy();
  return summarize(frame!, options.received);
}

function summarize(frame: Frame, received: unknown[]): object {
  return {
    phase: frame.phase,
    count: frame.chain.packets.length,
    types: frame.chain.packets.map((packet) => packet.type).join(','),
    armor: frame.chain.packets.map((packet) => packet.armor).join(','),
    score: received.filter((event) => (event as unknown[])[0] === 'score').at(-1),
    wave: received.filter((event) => (event as unknown[])[0] === 'wave').at(-1),
    events: received.map((event) => JSON.stringify(event)),
  };
}

function fireAt(listeners: Map<string, EventListener>, shot: number): void {
  const [clientX, clientY] = AIM_POINTS[(shot - 1) % AIM_POINTS.length]!;
  listeners.get('pointermove')!({ pointerType: 'mouse', clientX, clientY } as unknown as Event);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('campaign replay through public engine input and animation frames', () => {
  it('preserves the level 13 armor replay', () => {
    expect(replay(13)).toMatchInlineSnapshot(`
      {
        "armor": "0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
        "count": 78,
        "events": [
          "["score",0]",
          "["level",13]",
          "["wave",1,1]",
          "["next","INFO"]",
          "["next","SUCCESS"]",
          "["next","DEBUG"]",
          "["next","TRACE"]",
          "["next","WARNING"]",
          "["next","TRACE"]",
          "["next","ERROR"]",
          "["next","SUCCESS"]",
          "["next","ERROR"]",
          "["next","WARNING"]",
          "["next","TRACE"]",
          "["next","INFO"]",
          "["next","SUCCESS"]",
          "["next","SUCCESS"]",
          "["next","INFO"]",
          "["next","INFO"]",
          "["next","ERROR"]",
          "["next","INFO"]",
          "["next","DEBUG"]",
          "["next","TRACE"]",
          "["next","ERROR"]",
          "["next","ERROR"]",
          "["next","INFO"]",
          "["next","DEBUG"]",
          "["next","DEBUG"]",
          "["next","TRACE"]",
          "["next","TRACE"]",
          "["next","FATAL"]",
          "["next","WARNING"]",
          "["next","SUCCESS"]",
          "["next","SUCCESS"]",
          "["next","SUCCESS"]",
          "["next","FATAL"]",
          "["next","WARNING"]",
          "["next","ERROR"]",
          "["next","DEBUG"]",
          "["next","FATAL"]",
          "["next","INFO"]",
          "["next","TRACE"]",
          "["next","SUCCESS"]",
          "["next","TRACE"]",
          "["next","FATAL"]",
          "["next","DEBUG"]",
          "["next","INFO"]",
          "["next","ERROR"]",
          "["next","DEBUG"]",
          "["next","WARNING"]",
          "["next","INFO"]",
          "["next","ERROR"]",
          "["next","SUCCESS"]",
          "["next","DEBUG"]",
          "["next","DEBUG"]",
          "["next","WARNING"]",
          "["score",30]",
          "["next","SUCCESS"]",
          "["next","INFO"]",
          "["next","INFO"]",
          "["next","TRACE"]",
          "["end",{"mode":"campaign","score":30,"levelReached":13,"levelScore":30,"won":false}]",
        ],
        "phase": "gameOver",
        "score": [
          "score",
          30,
        ],
        "types": "ERROR,SUCCESS,INFO,WARNING,WARNING,DEBUG,SUCCESS,TRACE,WARNING,TRACE,DEBUG,SUCCESS,ERROR,SUCCESS,TRACE,WARNING,FATAL,INFO,ERROR,FATAL,INFO,ERROR,SUCCESS,DEBUG,ERROR,ERROR,DEBUG,INFO,FATAL,INFO,DEBUG,DEBUG,ERROR,DEBUG,TRACE,SUCCESS,TRACE,DEBUG,SUCCESS,TRACE,WARNING,INFO,WARNING,INFO,SUCCESS,INFO,DEBUG,ERROR,WARNING,ERROR,ERROR,TRACE,INFO,SUCCESS,SUCCESS,INFO,FATAL,WARNING,FATAL,INFO,WARNING,SUCCESS,FATAL,FATAL,INFO,WARNING,FATAL,WARNING,DEBUG,WARNING,TRACE,DEBUG,INFO,DEBUG,INFO,INFO,WARNING,TRACE",
        "wave": [
          "wave",
          1,
          1,
        ],
      }
    `);
  });
  it('preserves the level 25 waves replay', () => {
    expect(replay(25)).toMatchInlineSnapshot(`
      {
        "armor": "0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
        "count": 104,
        "events": [
          "["score",0]",
          "["level",25]",
          "["wave",1,2]",
          "["next","FATAL"]",
          "["next","TRACE"]",
          "["next","SUCCESS"]",
          "["next","SUCCESS"]",
          "["next","DEBUG"]",
          "["next","TRACE"]",
          "["next","INFO"]",
          "["next","ERROR"]",
          "["next","SUCCESS"]",
          "["next","DEBUG"]",
          "["next","SUCCESS"]",
          "["next","ERROR"]",
          "["next","FATAL"]",
          "["next","ERROR"]",
          "["next","TRACE"]",
          "["next","ERROR"]",
          "["next","TRACE"]",
          "["next","SUCCESS"]",
          "["next","ERROR"]",
          "["next","SUCCESS"]",
          "["next","WARNING"]",
          "["next","ERROR"]",
          "["next","ERROR"]",
          "["next","TRACE"]",
          "["next","TRACE"]",
          "["next","INFO"]",
          "["next","WARNING"]",
          "["next","DEBUG"]",
          "["next","WARNING"]",
          "["next","DEBUG"]",
          "["next","INFO"]",
          "["next","FATAL"]",
          "["next","INFO"]",
          "["next","FATAL"]",
          "["next","FATAL"]",
          "["next","INFO"]",
          "["next","ERROR"]",
          "["next","SUCCESS"]",
          "["next","FATAL"]",
          "["next","INFO"]",
          "["next","SUCCESS"]",
          "["next","INFO"]",
          "["next","FATAL"]",
          "["next","WARNING"]",
          "["next","TRACE"]",
          "["next","ERROR"]",
          "["next","WARNING"]",
          "["next","SUCCESS"]",
          "["next","DEBUG"]",
          "["next","SUCCESS"]",
          "["next","SUCCESS"]",
          "["next","ERROR"]",
          "["end",{"mode":"campaign","score":0,"levelReached":25,"levelScore":0,"won":false}]",
        ],
        "phase": "gameOver",
        "score": [
          "score",
          0,
        ],
        "types": "SUCCESS,INFO,WARNING,FATAL,TRACE,WARNING,SUCCESS,INFO,TRACE,ERROR,TRACE,ERROR,WARNING,TRACE,WARNING,ERROR,INFO,WARNING,TRACE,FATAL,INFO,INFO,FATAL,FATAL,ERROR,ERROR,TRACE,ERROR,DEBUG,ERROR,ERROR,SUCCESS,WARNING,ERROR,ERROR,WARNING,TRACE,INFO,INFO,INFO,INFO,TRACE,SUCCESS,INFO,DEBUG,TRACE,TRACE,DEBUG,WARNING,SUCCESS,INFO,WARNING,WARNING,INFO,TRACE,TRACE,DEBUG,ERROR,TRACE,SUCCESS,SUCCESS,FATAL,SUCCESS,ERROR,SUCCESS,ERROR,INFO,WARNING,SUCCESS,SUCCESS,DEBUG,ERROR,TRACE,TRACE,WARNING,TRACE,FATAL,INFO,TRACE,SUCCESS,WARNING,INFO,FATAL,ERROR,SUCCESS,ERROR,WARNING,INFO,SUCCESS,FATAL,FATAL,INFO,ERROR,FATAL,INFO,INFO,DEBUG,TRACE,WARNING,DEBUG,DEBUG,WARNING,SUCCESS,INFO",
        "wave": [
          "wave",
          1,
          2,
        ],
      }
    `);
  });
});
