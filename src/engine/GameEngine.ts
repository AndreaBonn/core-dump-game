import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIXED_TIMESTEP,
  LEVEL_CLEAR_BONUS,
  MAX_FRAME_TIME,
  PACKET_RADIUS,
  VOID_RADIUS,
} from '@/config/constants';
import { getLevel, TOTAL_LEVELS, type LevelConfig } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { BOARD_CENTER } from '@/config/paths';
import { FORK_SPREAD, ROLLBACK_DISTANCE, SLEEP_DURATION, SLEEP_FACTOR } from '@/config/powerUps';
import { audioManager } from '@/engine/audio/AudioManager';
import { generateChainPackets } from '@/engine/core/chainOps';
import { Chain } from '@/engine/entities/Chain';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createRng, type Rng } from '@/engine/math/rng';
import { vec2, type Vec2 } from '@/engine/math/vec2';
import { presentTypes, removeAllOfType, rollbackChain } from '@/engine/systems/PowerUpSystem';
import { applyShot } from '@/engine/systems/ShotSystem';
import { InputSystem } from '@/engine/systems/InputSystem';
import { RenderSystem } from '@/engine/systems/RenderSystem';
import type { EngineEvents, GamePhase, PacketType, PowerUpType } from '@/types/game.types';

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

  private baseSpeed = 0;
  private sleepTimer = 0;
  private pendingFork = false;

  private level = 1;
  private score = 0;
  private levelStartScore = 0;
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

  /** Start a fresh run from level 1, resetting the accumulated score. */
  startRun(): void {
    this.score = 0;
    this.events.onScoreChange(0);
    this.startLevel(1);
  }

  startLevel(level: number): void {
    const config = getLevel(level);
    this.level = level;
    this.levelStartScore = this.score;
    this.buildLevel(config);
    this.phase = 'playing';
    this.events.onLevelChange(level);
    this.events.onNextPacketChange(this.cursor.nextType);
  }

  /** Advance to the next level after a level-complete screen. */
  nextLevel(): void {
    if (this.phase === 'levelComplete' && this.level < TOTAL_LEVELS) {
      this.startLevel(this.level + 1);
    }
  }

  private buildLevel(config: LevelConfig): void {
    this.path = new Path(config.waypoints);
    this.voidHole = new VoidHole(this.path.voidPosition, this.path.length);
    this.rng = createRng(config.seed);
    this.types = typesForCount(config.colorCount);
    this.baseSpeed = config.chainSpeed;
    this.sleepTimer = 0;
    this.pendingFork = false;
    this.chain = new Chain(
      generateChainPackets({
        count: config.chainLength,
        types: this.types,
        rng: this.rng,
        powerUpChance: config.powerUpChance,
      }),
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
    const angles = this.pendingFork
      ? [this.cursor.angle - FORK_SPREAD, this.cursor.angle, this.cursor.angle + FORK_SPREAD]
      : [this.cursor.angle];
    for (const angle of angles) {
      this.projectiles.push(new Projectile(this.cursor.position, angle, type));
    }
    this.pendingFork = false;
    audioManager.play('shoot');
    this.events.onNextPacketChange(this.cursor.nextType);
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const frameTime = Math.min((now - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.accumulator += frameTime;
      // Re-check the phase each step: fixedUpdate can end the level or the game
      // mid-frame, and remaining steps must not keep simulating past that.
      while (this.phase === 'playing' && this.accumulator >= FIXED_TIMESTEP) {
        this.fixedUpdate(FIXED_TIMESTEP);
        this.accumulator -= FIXED_TIMESTEP;
      }
    }
    this.drawFrame();
  };

  private fixedUpdate(dt: number): void {
    this.updateSleep(dt);
    this.chain.advance(dt);
    this.updateProjectiles(dt);
    if (this.voidHole.hasSwallowed(this.chain.frontDistance, VOID_RADIUS)) {
      this.endGame();
    }
  }

  private updateSleep(dt: number): void {
    if (this.sleepTimer > 0) {
      this.sleepTimer -= dt;
      if (this.sleepTimer <= 0) {
        this.chain.speed = this.baseSpeed;
      }
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
    const outcome = applyShot(this.chain.packets, this.path, projectile);
    if (!outcome.hit) {
      return false;
    }
    if (outcome.explosions > 0) {
      this.score += outcome.score;
      this.events.onScoreChange(this.score);
      audioManager.play('match');
      if (outcome.combo) {
        this.events.onComboChange(outcome.combo);
        audioManager.play(
          `combo-${Math.min(outcome.combo.multiplier, 4)}` as 'combo-2' | 'combo-3' | 'combo-4',
        );
      }
      for (const powerUp of outcome.powerUps) {
        this.applyPowerUp(powerUp);
      }
    }
    if (outcome.clearedChain) {
      this.completeLevel();
    }
    return true;
  }

  private completeLevel(): void {
    this.projectiles = [];
    const levelScore = this.score - this.levelStartScore;
    this.score += LEVEL_CLEAR_BONUS;
    this.events.onScoreChange(this.score);
    audioManager.play('level-complete');
    if (this.level >= TOTAL_LEVELS) {
      this.phase = 'gameWon';
      this.events.onGameWon(this.score, this.level);
    } else {
      this.phase = 'levelComplete';
      this.events.onLevelComplete(levelScore, LEVEL_CLEAR_BONUS);
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case 'SLEEP':
        this.chain.speed = this.baseSpeed * SLEEP_FACTOR;
        this.sleepTimer = SLEEP_DURATION;
        break;
      case 'FORK':
        this.pendingFork = true;
        break;
      case 'GARBAGE_COLLECT': {
        const candidates = presentTypes(this.chain.packets);
        if (candidates.length > 0) {
          removeAllOfType(this.chain.packets, this.rng.pick(candidates));
        }
        break;
      }
      case 'ROLLBACK':
        rollbackChain(this.chain.packets, ROLLBACK_DISTANCE);
        break;
    }
    audioManager.play('powerup');
    this.events.onPowerUp(type);
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
    this.projectiles = [];
    audioManager.play('game-over');
    this.events.onGameOver(this.score, this.level);
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
