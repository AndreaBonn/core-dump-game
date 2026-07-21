import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIXED_TIMESTEP,
  MAX_FRAME_TIME,
  VOID_RADIUS,
} from '@/config/constants';
import { getLevel } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { generateChainPackets } from '@/engine/core/chainOps';
import { Chain } from '@/engine/entities/Chain';
import { Path } from '@/engine/entities/Path';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createRng } from '@/engine/math/rng';
import { RenderSystem } from '@/engine/systems/RenderSystem';
import type { EngineEvents, GamePhase } from '@/types/game.types';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly render: RenderSystem;
  private readonly events: EngineEvents;

  private path!: Path;
  private chain!: Chain;
  private voidHole!: VoidHole;

  private level = 1;
  private phase: GamePhase = 'idle';
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context is not available');
    }
    this.ctx = context;
    this.render = new RenderSystem(BOARD_WIDTH, BOARD_HEIGHT);
    this.events = events;
  }

  startLevel(level: number): void {
    const config = getLevel(level);
    this.level = level;
    this.path = new Path(config.waypoints);
    this.voidHole = new VoidHole(this.path.voidPosition, this.path.length);
    const rng = createRng(config.seed);
    const types = typesForCount(config.colorCount);
    this.chain = new Chain(generateChainPackets(config.chainLength, types, rng), config.chainSpeed);
    this.phase = 'playing';
    this.events.onLevelChange(level);
  }

  start(): void {
    if (this.rafId !== 0) {
      return;
    }
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
    }
  }

  resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastTime = performance.now();
    }
  }

  destroy(): void {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    const canvas = this.ctx.canvas;
    canvas.width = Math.round(cssWidth * devicePixelRatio);
    canvas.height = Math.round(cssHeight * devicePixelRatio);
    const scale = Math.min(cssWidth / BOARD_WIDTH, cssHeight / BOARD_HEIGHT);
    this.viewport = {
      scale: scale * devicePixelRatio,
      offsetX: ((cssWidth - BOARD_WIDTH * scale) / 2) * devicePixelRatio,
      offsetY: ((cssHeight - BOARD_HEIGHT * scale) / 2) * devicePixelRatio,
    };
    this.drawFrame();
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const frameTime = Math.min((now - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.accumulator += frameTime;
      while (this.accumulator >= FIXED_TIMESTEP) {
        this.fixedUpdate(FIXED_TIMESTEP);
        this.accumulator -= FIXED_TIMESTEP;
      }
    }
    this.drawFrame();
  };

  private fixedUpdate(dt: number): void {
    this.chain.advance(dt);
    if (this.voidHole.hasSwallowed(this.chain.frontDistance, VOID_RADIUS)) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.phase = 'gameOver';
    this.events.onGameOver(0, this.level);
  }

  private drawFrame(): void {
    const { scale, offsetX, offsetY } = this.viewport;
    this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    this.render.render(this.ctx, {
      path: this.path,
      packets: this.chain.packets,
      voidPosition: this.voidHole.position,
    });
  }
}
