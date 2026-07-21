import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIXED_TIMESTEP,
  MAX_FRAME_TIME,
  PACKET_RADIUS,
  VOID_RADIUS,
} from '@/config/constants';
import { getLevel, type LevelConfig } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { BOARD_CENTER } from '@/config/paths';
import { generateChainPackets, insertPacketAt } from '@/engine/core/chainOps';
import { Chain } from '@/engine/entities/Chain';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { createPacket } from '@/engine/entities/DataPacket';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createRng, type Rng } from '@/engine/math/rng';
import { vec2, type Vec2 } from '@/engine/math/vec2';
import { findCollisionIndex, resolveInsertPosition } from '@/engine/systems/CollisionSystem';
import { InputSystem } from '@/engine/systems/InputSystem';
import { RenderSystem } from '@/engine/systems/RenderSystem';
import type { EngineEvents, GamePhase, PacketType } from '@/types/game.types';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const PROJECTILE_MARGIN = PACKET_RADIUS * 2;

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly render: RenderSystem;
  private readonly events: EngineEvents;
  private readonly input: InputSystem;

  private path!: Path;
  private chain!: Chain;
  private voidHole!: VoidHole;
  private cursor!: CpuCursor;
  private rng: Rng = createRng(1);
  private types: readonly PacketType[] = [];
  private projectiles: Projectile[] = [];

  private level = 1;
  private phase: GamePhase = 'idle';
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private dpr = 1;
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context is not available');
    }
    this.canvas = canvas;
    this.ctx = context;
    this.render = new RenderSystem(BOARD_WIDTH, BOARD_HEIGHT);
    this.events = events;
    this.input = new InputSystem(
      canvas,
      { onAim: (point) => this.aim(point), onFire: () => this.fire() },
      (clientX, clientY) => this.screenToBoard(clientX, clientY),
    );
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      this.fire();
    }
  };

  startLevel(level: number): void {
    const config = getLevel(level);
    this.level = level;
    this.buildLevel(config);
    this.phase = 'playing';
    this.events.onLevelChange(level);
    this.events.onNextPacketChange(this.cursor.nextType);
  }

  private buildLevel(config: LevelConfig): void {
    this.path = new Path(config.waypoints);
    this.voidHole = new VoidHole(this.path.voidPosition, this.path.length);
    this.rng = createRng(config.seed);
    this.types = typesForCount(config.colorCount);
    this.chain = new Chain(
      generateChainPackets(config.chainLength, this.types, this.rng),
      config.chainSpeed,
    );
    this.cursor = new CpuCursor(BOARD_CENTER, this.drawType(), this.drawType());
    this.projectiles = [];
  }

  private drawType(): PacketType {
    return this.rng.pick(this.types);
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
    this.input.destroy();
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.dpr = devicePixelRatio;
    this.canvas.width = Math.round(cssWidth * devicePixelRatio);
    this.canvas.height = Math.round(cssHeight * devicePixelRatio);
    const scale = Math.min(cssWidth / BOARD_WIDTH, cssHeight / BOARD_HEIGHT);
    this.viewport = {
      scale,
      offsetX: (cssWidth - BOARD_WIDTH * scale) / 2,
      offsetY: (cssHeight - BOARD_HEIGHT * scale) / 2,
    };
    this.drawFrame();
  }

  private screenToBoard(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = this.viewport;
    return vec2((clientX - rect.left - offsetX) / scale, (clientY - rect.top - offsetY) / scale);
  }

  private aim(point: Vec2): void {
    if (this.phase === 'playing') {
      this.cursor.aimAt(point);
    }
  }

  private fire(): void {
    if (this.phase !== 'playing') {
      return;
    }
    const type = this.cursor.loadNext(this.drawType());
    this.projectiles.push(new Projectile(this.cursor.position, this.cursor.angle, type));
    this.events.onNextPacketChange(this.cursor.nextType);
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
    this.updateProjectiles(dt);
    if (this.voidHole.hasSwallowed(this.chain.frontDistance, VOID_RADIUS)) {
      this.endGame();
    }
  }

  private updateProjectiles(dt: number): void {
    const survivors: Projectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.advance(dt);
      if (this.tryInsert(projectile)) {
        continue;
      }
      if (this.isInsideBoard(projectile.position)) {
        survivors.push(projectile);
      }
    }
    this.projectiles = survivors;
  }

  private tryInsert(projectile: Projectile): boolean {
    const index = findCollisionIndex(this.chain.packets, this.path, projectile.position);
    if (index < 0) {
      return false;
    }
    const position = resolveInsertPosition(
      this.chain.packets,
      this.path,
      index,
      projectile.position,
    );
    insertPacketAt(
      this.chain.packets,
      position,
      createPacket({ type: projectile.type, distance: 0 }),
    );
    return true;
  }

  private isInsideBoard(point: Vec2): boolean {
    return (
      point.x >= -PROJECTILE_MARGIN &&
      point.x <= BOARD_WIDTH + PROJECTILE_MARGIN &&
      point.y >= -PROJECTILE_MARGIN &&
      point.y <= BOARD_HEIGHT + PROJECTILE_MARGIN
    );
  }

  private endGame(): void {
    this.phase = 'gameOver';
    this.events.onGameOver(0, this.level);
  }

  private drawFrame(): void {
    const { scale, offsetX, offsetY } = this.viewport;
    this.ctx.setTransform(
      scale * this.dpr,
      0,
      0,
      scale * this.dpr,
      offsetX * this.dpr,
      offsetY * this.dpr,
    );
    if (this.phase === 'idle') {
      return;
    }
    this.render.render(this.ctx, {
      path: this.path,
      packets: this.chain.packets,
      voidPosition: this.voidHole.position,
      cursor: this.cursor,
      projectiles: this.projectiles,
    });
  }
}
