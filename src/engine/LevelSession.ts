import { PACKET_RADIUS, VOID_RADIUS } from '@/config/constants';
import type { LevelConfig } from '@/config/levels';
import { SHIELD_ROLLBACK } from '@/config/powerUps';
import { isInsideBoard } from '@/engine/core/bounds';
import { directionFactor, telegraphPhase } from '@/engine/core/chainMotion';
import { resolveChainCompletion } from '@/engine/core/chainCompletion';
import { buildLevelState, drawPacketType, type LevelState } from '@/engine/core/levelBuilder';
import type { Chain } from '@/engine/entities/Chain';
import type { CpuCursor } from '@/engine/entities/CpuCursor';
import type { Path } from '@/engine/entities/Path';
import type { Projectile } from '@/engine/entities/Projectile';
import type { Vec2 } from '@/engine/math/vec2';
import { resolvePowerUp, rollbackChain } from '@/engine/systems/PowerUpSystem';
import {
  applyShot,
  spawnProjectiles,
  type Shot,
  type ShotOutcome,
} from '@/engine/systems/ShotSystem';
import type { PacketType, PowerUpType } from '@/types/game.types';

const PROJECTILE_MARGIN = PACKET_RADIUS * 2;
type PacketColor = (type: PacketType) => string;
type SessionParts = Partial<Pick<LevelState, 'path' | 'chain' | 'voidHole' | 'cursor'>>;

export type SessionEvent =
  | { kind: 'shot'; outcome: ShotOutcome; at: Vec2; color: string }
  | { kind: 'powerUp'; type: PowerUpType }
  | { kind: 'hazardCleared'; at: Vec2 }
  | { kind: 'wave'; wave: number; total: number }
  | { kind: 'cleared' }
  | { kind: 'shieldCaught' }
  | { kind: 'breached' };

export class LevelSession {
  private state: LevelState;
  private levelTime = 0;
  private sleepTimer = 0;
  private pendingFork = false;
  private shielded = false;
  private isFinished = false;
  private shots: Projectile[] = [];
  private wave = 1;

  constructor(private readonly levelConfig: LevelConfig) {
    this.state = buildLevelState(levelConfig);
  }

  /** Build a seeded session with supplied entities for deterministic simulation tests. */
  static fromParts(config: LevelConfig, parts: SessionParts): LevelSession {
    const session = new LevelSession(config);
    session.state = {
      ...session.state,
      ...parts,
      baseSpeed: parts.chain?.speed ?? config.chainSpeed,
    };
    return session;
  }

  get path(): Path {
    return this.state.path;
  }
  get chain(): Chain {
    return this.state.chain;
  }
  get voidPosition(): Vec2 {
    return this.state.voidHole.position;
  }
  get cursor(): CpuCursor {
    return this.state.cursor;
  }
  get projectiles(): readonly Projectile[] {
    return this.shots;
  }
  get nextType(): PacketType {
    return this.cursor.nextType;
  }
  get currentWave(): number {
    return this.wave;
  }
  get reversalPhase(): number {
    return telegraphPhase(this.levelTime, this.levelConfig.reversal);
  }

  aim(point: Vec2): void {
    this.cursor.aimAt(point);
  }
  swap(): void {
    this.cursor.swap();
  }

  /** Fire the ready packet and consume a pending fork, drawing from this level's RNG. */
  fire(): Shot {
    const type = this.cursor.loadNext(drawPacketType(this.state.rng, this.state.types));
    const { position, angle } = this.cursor;
    this.shots.push(...spawnProjectiles(position, angle, type, this.pendingFork));
    this.pendingFork = false;
    return { type, position };
  }

  /** Advance one simulation step and return feedback in collision/completion order. */
  step(dt: number, packetColor: PacketColor): SessionEvent[] {
    if (this.isFinished) return [];
    const events: SessionEvent[] = [];
    this.levelTime += dt;
    this.updateSleep(dt);
    this.chain.advance(dt * directionFactor(this.levelTime, this.levelConfig.reversal));
    this.updateProjectiles(dt, packetColor, events);
    if (!this.isFinished) this.checkVoid(events);
    return events;
  }

  private updateSleep(dt: number): void {
    if (this.sleepTimer <= 0) return;
    this.sleepTimer -= dt;
    if (this.sleepTimer <= 0) this.chain.speed = this.state.baseSpeed;
  }

  private updateProjectiles(dt: number, packetColor: PacketColor, events: SessionEvent[]): void {
    const survivors: Projectile[] = [];
    for (const projectile of this.shots) {
      projectile.advance(dt);
      if (this.tryInsert(projectile, packetColor, events)) {
        if (this.isFinished) return;
        continue;
      }
      if (isInsideBoard(projectile.position, PROJECTILE_MARGIN)) survivors.push(projectile);
    }
    this.shots = survivors;
  }

  private tryInsert(
    projectile: Projectile,
    packetColor: PacketColor,
    events: SessionEvent[],
  ): boolean {
    const outcome = applyShot(this.chain.packets, this.path, projectile, packetColor);
    if (!outcome.hit) return false;
    events.push({
      kind: 'shot',
      outcome,
      at: projectile.position,
      color: packetColor(projectile.type),
    });
    if (outcome.explosions > 0 || outcome.cracked > 0) {
      for (const type of outcome.powerUps) {
        this.applyPowerUp(type);
        events.push({ kind: 'powerUp', type });
      }
    }
    // Power-ups may empty the chain after the shot outcome was computed.
    this.resolveChainEnd(events);
    return true;
  }

  private resolveChainEnd(events: SessionEvent[]): void {
    resolveChainCompletion(this.chain, this.levelConfig, this.wave, {
      onHazard: (hazard) =>
        events.push({ kind: 'hazardCleared', at: this.path.pointAt(hazard.distance) }),
      onNextWave: (next) => {
        this.wave = next.wave;
        this.chain.packets.splice(0, this.chain.packets.length, ...next.packets);
        events.push({ kind: 'wave', wave: next.wave, total: next.total });
      },
      onComplete: () => this.finish('cleared', events),
    });
  }

  private applyPowerUp(type: PowerUpType): void {
    const effect = resolvePowerUp(type, { packets: this.chain.packets, rng: this.state.rng });
    if (effect.speedFactor !== null) this.chain.speed = this.state.baseSpeed * effect.speedFactor;
    this.sleepTimer = effect.sleepSeconds ?? this.sleepTimer;
    this.pendingFork ||= effect.armsFork;
    this.shielded ||= effect.grantsShield;
  }

  private checkVoid(events: SessionEvent[]): void {
    if (!this.state.voidHole.hasSwallowed(this.chain.frontDistance, VOID_RADIUS)) return;
    if (this.shielded) {
      this.shielded = false;
      rollbackChain(this.chain.packets, SHIELD_ROLLBACK);
      events.push({ kind: 'shieldCaught' });
      return;
    }
    this.finish('breached', events);
  }

  private finish(kind: 'cleared' | 'breached', events: SessionEvent[]): void {
    this.isFinished = true;
    this.shots = [];
    events.push({ kind });
  }
}
