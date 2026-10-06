import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIXED_TIMESTEP,
  LEVEL_CLEAR_BONUS,
  MAX_FRAME_TIME,
} from '@/config/constants';
import { LevelSession } from '@/engine/LevelSession';
import {
  GAME_OVER_SHAKE,
  presentSessionEvent,
  scoreSessionShot,
} from '@/engine/systems/sessionFeedback';
import type { ShotOutcome } from '@/engine/systems/ShotSystem';
import { audioManager } from '@/engine/audio/AudioManager';
import { buildRunResult } from '@/engine/core/runFeedback';
import { campaignConfig, isRunWon, type RunConfig } from '@/engine/core/runController';
import { type Vec2 } from '@/engine/math/vec2';
import { InputSystem } from '@/engine/systems/InputSystem';
import { EngineRenderer, requireCanvasContext } from '@/engine/systems/EngineRenderer';
import { frameFor } from '@/engine/systems/sessionFrame';
import { VisualFx } from '@/engine/systems/VisualFx';
import { DEFAULT_THEME, type Theme } from '@/engine/systems/theme';
import type { EngineEvents, GamePhase } from '@/types/game.types';

/** Screen shake when a level is cleared, and when the chain reaches the void. */
const LEVEL_CLEAR_SHAKE = 6;

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly presenter: EngineRenderer;
  private readonly input: InputSystem;
  private readonly fx = new VisualFx();
  private session: LevelSession | null = null;
  private runConfig: RunConfig = campaignConfig();
  private level = 1;
  private score = 0;
  private levelStartScore = 0;
  private phase: GamePhase = 'idle';
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private hitStopSteps = 0;
  private reducedMotion = false;
  private theme: Theme = DEFAULT_THEME;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly events: EngineEvents,
  ) {
    this.ctx = requireCanvasContext(canvas);
    this.presenter = new EngineRenderer(BOARD_WIDTH, BOARD_HEIGHT);
    this.input = new InputSystem(
      canvas,
      { onAim: (point) => this.aim(point), onFire: () => this.fire(), onSwap: () => this.swap() },
      (clientX, clientY) => this.screenToBoard(clientX, clientY),
    );
  }
  private swap(): void {
    if (this.phase !== 'playing') return;
    this.live.swap();
    this.events.onNextPacketChange(this.live.nextType);
  }
  /** Start a fresh run with the selected level provider and reset the score. */
  startRun(config: RunConfig = campaignConfig()): void {
    this.runConfig = config;
    this.score = 0;
    this.events.onScoreChange(0);
    this.startLevel(config.startIndex);
  }
  startLevel(level: number): void {
    const config = this.runConfig.levelProvider(level);
    if (!config) return;
    this.level = level;
    this.levelStartScore = this.score;
    this.session = new LevelSession(config);
    this.phase = 'playing';
    this.events.onLevelChange(level);
    this.events.onWaveChange(1, config.waves);
    this.events.onNextPacketChange(this.live.nextType);
  }
  /** Advance to the next level after a level-complete screen. */
  nextLevel(): void {
    if (this.phase === 'levelComplete') {
      this.startLevel(this.level + 1);
    }
  }
  start(): void {
    if (this.rafId !== 0) return;
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
  /** Toggle reduced-motion: no shake, no particles, and no hit-stop. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.hitStopSteps = 0;
    this.fx.setReducedMotion(reduced);
  }
  setTheme(theme: Theme): void {
    this.theme = theme;
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
      this.live.aim(point);
    }
  }
  private fire(): void {
    if (this.phase !== 'playing') return;
    const { type, position } = this.live.fire();
    this.fx.spawnImpact(position, this.theme.packetColor(type));
    audioManager.play('shoot');
    this.events.onNextPacketChange(this.live.nextType);
  }
  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const frameTime = Math.min((now - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = now;
    if (this.phase === 'playing') {
      this.accumulator += frameTime;
      // Completion can stop the simulation midway through a frame.
      while (this.phase === 'playing' && this.accumulator >= FIXED_TIMESTEP) {
        if (this.hitStopSteps > 0) {
          this.hitStopSteps -= 1;
        } else {
          this.fixedUpdate(FIXED_TIMESTEP);
        }
        this.accumulator -= FIXED_TIMESTEP;
      }
    }
    this.drawFrame(frameTime);
  };
  private fixedUpdate(dt: number): void {
    for (const event of this.live.step(dt, this.theme.packetColor)) {
      presentSessionEvent(event, {
        fx: this.fx,
        events: this.events,
        onShot: (outcome) => this.scoreShot(outcome),
        onCleared: () => this.completeLevel(),
        onBreached: () => this.endGame(),
      });
    }
  }
  private scoreShot(outcome: ShotOutcome): void {
    if (outcome.explosions === 0 && outcome.cracked === 0) return;
    this.score += outcome.score;
    this.events.onScoreChange(this.score);
    this.hitStopSteps = scoreSessionShot(outcome, {
      hitStopSteps: this.hitStopSteps,
      reducedMotion: this.reducedMotion,
      events: this.events,
    });
  }
  private completeLevel(): void {
    const levelScore = this.score - this.levelStartScore;
    this.score += LEVEL_CLEAR_BONUS;
    this.events.onScoreChange(this.score);
    this.fx.addShake(LEVEL_CLEAR_SHAKE);
    audioManager.play('level-complete');
    if (isRunWon(this.level, this.runConfig.finalLevel)) {
      this.phase = 'gameWon';
      this.events.onRunEnd(
        buildRunResult(this.runConfig, this.score, this.level, { levelScore, won: true }),
      );
      return;
    }
    this.phase = 'levelComplete';
    this.events.onLevelComplete(levelScore, LEVEL_CLEAR_BONUS);
  }
  private endGame(): void {
    this.phase = 'gameOver';
    this.fx.addShake(GAME_OVER_SHAKE);
    audioManager.play('game-over');
    this.events.onRunEnd(
      buildRunResult(this.runConfig, this.score, this.level, {
        levelScore: this.score - this.levelStartScore,
        won: false,
      }),
    );
  }
  private drawFrame(dt: number): void {
    if (this.phase === 'idle') {
      this.presenter.applyIdleTransform(this.ctx);
      return;
    }
    const { phase, fx, reducedMotion, theme } = this;
    this.presenter.present(this.ctx, frameFor(this.live, { phase, fx, reducedMotion, theme }), dt);
  }

  /** The level in play: every game action runs only after startLevel has built one. */
  private get live(): LevelSession {
    if (!this.session) {
      throw new Error('GameEngine: no level in play');
    }
    return this.session;
  }
}
