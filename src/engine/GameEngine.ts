import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIXED_TIMESTEP,
  LEVEL_CLEAR_BONUS,
  MAX_FRAME_TIME,
  PACKET_RADIUS,
  VOID_RADIUS,
} from '@/config/constants';
import { type LevelConfig } from '@/config/levels';
import { colorForType } from '@/config/packetTypes';
import { FORK_SPREAD } from '@/config/powerUps';
import { audioManager } from '@/engine/audio/AudioManager';
import { buildLevelState, drawPacketType } from '@/engine/core/levelBuilder';
import { campaignConfig, type RunConfig } from '@/engine/core/runController';
import type { Chain } from '@/engine/entities/Chain';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import type { VoidHole } from '@/engine/entities/VoidHole';
import { createRng, type Rng } from '@/engine/math/rng';
import { type Vec2 } from '@/engine/math/vec2';
import { resolvePowerUp } from '@/engine/systems/PowerUpSystem';
import { applyShot } from '@/engine/systems/ShotSystem';
import { InputSystem } from '@/engine/systems/InputSystem';
import { EngineRenderer } from '@/engine/systems/EngineRenderer';
import { VisualFx } from '@/engine/systems/VisualFx';
import type { EngineEvents, GamePhase, PacketType, PowerUpType } from '@/types/game.types';

const PROJECTILE_MARGIN = PACKET_RADIUS * 2;

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly presenter: EngineRenderer;
  private readonly events: EngineEvents;
  private readonly input: InputSystem;
  private readonly fx = new VisualFx();

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

  private runConfig: RunConfig = campaignConfig();
  private level = 1;
  private score = 0;
  private levelStartScore = 0;
  private phase: GamePhase = 'idle';
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context is not available');
    }
    this.canvas = canvas;
    this.ctx = context;
    this.presenter = new EngineRenderer(BOARD_WIDTH, BOARD_HEIGHT);
    this.events = events;
    this.input = new InputSystem(
      canvas,
      { onAim: (point) => this.aim(point), onFire: () => this.fire(), onSwap: () => this.swap() },
      (clientX, clientY) => this.screenToBoard(clientX, clientY),
    );
  }

  private swap(): void {
    if (this.phase !== 'playing') {
      return;
    }
    this.cursor.swap();
    this.events.onNextPacketChange(this.cursor.nextType);
  }

  /**
   * Start a fresh run, resetting the accumulated score. The RunConfig selects
   * the mode (campaign/endless/daily) via its level provider; defaults to the
   * campaign so existing callers and tests keep the previous behaviour.
   */
  startRun(config: RunConfig = campaignConfig()): void {
    this.runConfig = config;
    this.score = 0;
    this.events.onScoreChange(0);
    this.startLevel(config.startIndex);
  }

  startLevel(level: number): void {
    const config = this.runConfig.levelProvider(level);
    if (!config) {
      return;
    }
    this.level = level;
    this.levelStartScore = this.score;
    this.buildLevel(config);
    this.phase = 'playing';
    this.events.onLevelChange(level);
    this.events.onNextPacketChange(this.cursor.nextType);
  }

  /** Advance to the next level after a level-complete screen. */
  nextLevel(): void {
    if (this.phase === 'levelComplete') {
      this.startLevel(this.level + 1);
    }
  }

  private buildLevel(config: LevelConfig): void {
    const state = buildLevelState(config);
    this.path = state.path;
    this.voidHole = state.voidHole;
    this.chain = state.chain;
    this.cursor = state.cursor;
    this.rng = state.rng;
    this.types = state.types;
    this.baseSpeed = state.baseSpeed;
    this.sleepTimer = 0;
    this.pendingFork = false;
    this.projectiles = [];
  }

  private drawType(): PacketType {
    return drawPacketType(this.rng, this.types);
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
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** Toggle reduced-motion, suppressing screen shake and particle bursts. */
  setReducedMotion(reduced: boolean): void {
    this.fx.setReducedMotion(reduced);
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.presenter.configure(this.canvas, cssWidth, cssHeight, devicePixelRatio);
    this.drawFrame(0);
  }

  private screenToBoard(clientX: number, clientY: number): Vec2 {
    return this.presenter.screenToBoard(this.canvas, clientX, clientY);
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
    this.fx.spawnImpact(this.cursor.position, colorForType(type));
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
    this.drawFrame(frameTime);
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
    this.fx.spawnImpact(projectile.position, colorForType(projectile.type));
    this.fx.popPacket(outcome.insertedId);
    if (outcome.explosions > 0) {
      this.score += outcome.score;
      this.events.onScoreChange(this.score);
      audioManager.play('match');
      for (const burst of outcome.bursts) {
        this.fx.spawnExplosion(burst.point, burst.color);
      }
      this.fx.addShake(4 + outcome.explosions * 4);
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
    this.fx.addShake(6);
    audioManager.play('level-complete');
    // A run ends in victory only when the mode has a final level and we reached
    // it; endless and daily runs have no final level, so they only end on game
    // over.
    const finalLevel = this.runConfig.finalLevel;
    const isFinalLevel = finalLevel !== null && this.level >= finalLevel;
    if (isFinalLevel) {
      this.phase = 'gameWon';
      this.events.onGameWon(this.score, this.level);
    } else {
      this.phase = 'levelComplete';
      this.events.onLevelComplete(levelScore, LEVEL_CLEAR_BONUS);
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    const effect = resolvePowerUp(type, { packets: this.chain.packets, rng: this.rng });
    if (effect.speedFactor !== null) {
      this.chain.speed = this.baseSpeed * effect.speedFactor;
    }
    if (effect.sleepSeconds !== null) {
      this.sleepTimer = effect.sleepSeconds;
    }
    if (effect.armsFork) {
      this.pendingFork = true;
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
    this.fx.addShake(16);
    audioManager.play('game-over');
    this.events.onGameOver(this.score, this.level);
  }

  private drawFrame(dt: number): void {
    // Before the first level is built the entities do not exist yet, so only
    // the base transform is applied and nothing is read.
    if (this.phase === 'idle') {
      this.presenter.applyIdleTransform(this.ctx);
      return;
    }
    this.presenter.present(
      this.ctx,
      {
        phase: this.phase,
        path: this.path,
        chain: this.chain,
        voidPosition: this.voidHole.position,
        cursor: this.cursor,
        projectiles: this.projectiles,
        fx: this.fx,
      },
      dt,
    );
  }
}
