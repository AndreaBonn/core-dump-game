import { PACKET_RADIUS } from '@/config/constants';
import { easeOutBack } from '@/engine/math/easing';
import type { Vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/** An expanding, fading ring used for impacts and match shockwaves. */
export interface Ripple {
  x: number;
  y: number;
  age: number;
  duration: number;
  fromRadius: number;
  toRadius: number;
  color: string;
  width: number;
}

const POP_DURATION = 0.16;
const SMOOTH_RATE = 16; // how fast the rendered distance catches the true one
const PARTICLE_DRAG = 2.2;
const SHAKE_DECAY = 9;
const SHAKE_FREQ = 47;
const MAX_SHAKE = 22;

/**
 * Transient, view-only animation state layered on top of the deterministic
 * simulation: particle bursts, shockwave ripples, per-packet pop-in, a
 * smoothed render distance that turns discrete chain snaps into slides, and a
 * decaying screen shake. Driven by wall-clock time, never read by the sim, so
 * it cannot affect gameplay or its tests.
 */
export class VisualFx {
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private readonly pops = new Map<number, number>();
  private readonly renderDist = new Map<number, number>();
  private shakeMag = 0;
  private reducedMotion = false;
  time = 0;

  /** When on, suppress screen shake and particle bursts (prefers-reduced-motion). */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  update(dt: number): void {
    this.time += dt;
    this.advanceParticles(dt);
    this.advanceRipples(dt);
    this.advancePops(dt);
    this.shakeMag *= Math.exp(-SHAKE_DECAY * dt);
  }

  /** Reconcile per-packet smoothed distances so the chain slides, not snaps. */
  syncChain(packets: readonly DataPacket[], dt: number): void {
    const factor = Math.min(1, SMOOTH_RATE * dt);
    const present = new Set<number>();
    for (const packet of packets) {
      present.add(packet.id);
      const current = this.renderDist.get(packet.id);
      if (current === undefined) {
        this.renderDist.set(packet.id, packet.distance);
      } else {
        this.renderDist.set(packet.id, current + (packet.distance - current) * factor);
      }
    }
    for (const id of this.renderDist.keys()) {
      if (!present.has(id)) {
        this.renderDist.delete(id);
      }
    }
  }

  private advanceParticles(dt: number): void {
    const alive: Particle[] = [];
    const drag = Math.max(0, 1 - PARTICLE_DRAG * dt);
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        continue;
      }
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      alive.push(p);
    }
    this.particles = alive;
  }

  private advanceRipples(dt: number): void {
    const alive: Ripple[] = [];
    for (const r of this.ripples) {
      r.age += dt;
      if (r.age < r.duration) {
        alive.push(r);
      }
    }
    this.ripples = alive;
  }

  private advancePops(dt: number): void {
    for (const [id, elapsed] of this.pops) {
      const next = elapsed + dt;
      if (next >= POP_DURATION) {
        this.pops.delete(id);
      } else {
        this.pops.set(id, next);
      }
    }
  }

  /** Rendered arc-length distance for a packet, smoothed toward its true one. */
  renderDistanceFor(packet: DataPacket): number {
    return this.renderDist.get(packet.id) ?? packet.distance;
  }

  /** Scale multiplier for a packet mid pop-in (1 when settled). */
  popScaleFor(id: number): number {
    const elapsed = this.pops.get(id);
    return elapsed === undefined ? 1 : easeOutBack(elapsed / POP_DURATION);
  }

  shakeOffset(): Vec2 {
    if (this.shakeMag < 0.05) {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.cos(this.time * SHAKE_FREQ) * this.shakeMag,
      y: Math.sin(this.time * SHAKE_FREQ * 1.3) * this.shakeMag,
    };
  }

  get activeParticles(): readonly Particle[] {
    return this.particles;
  }

  get activeRipples(): readonly Ripple[] {
    return this.ripples;
  }

  popPacket(id: number | null): void {
    if (id !== null) {
      this.pops.set(id, 0);
    }
  }

  addShake(magnitude: number): void {
    if (this.reducedMotion) {
      return;
    }
    this.shakeMag = Math.min(MAX_SHAKE, Math.max(this.shakeMag, magnitude));
  }

  /** A small ring plus a few sparks where a projectile lodges into the chain. */
  spawnImpact(point: Vec2, color: string): void {
    if (this.reducedMotion) {
      return;
    }
    this.ripples.push({
      x: point.x,
      y: point.y,
      age: 0,
      duration: 0.26,
      fromRadius: PACKET_RADIUS * 0.5,
      toRadius: PACKET_RADIUS * 2,
      color,
      width: 3,
    });
    this.emitParticles(point, color, 6, 40, 150, 0.18, 0.32, 1.5, 3);
  }

  /** A dense colored burst and a shockwave where a matched packet detonates. */
  spawnExplosion(point: Vec2, color: string): void {
    if (this.reducedMotion) {
      return;
    }
    this.ripples.push({
      x: point.x,
      y: point.y,
      age: 0,
      duration: 0.4,
      fromRadius: PACKET_RADIUS * 0.6,
      toRadius: PACKET_RADIUS * 3.2,
      color,
      width: 4,
    });
    this.emitParticles(point, color, 16, 70, 260, 0.32, 0.62, 2, 5);
  }

  private emitParticles(
    point: Vec2,
    color: string,
    count: number,
    minSpeed: number,
    maxSpeed: number,
    minLife: number,
    maxLife: number,
    minSize: number,
    maxSize: number,
  ): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const life = minLife + Math.random() * (maxLife - minLife);
      this.particles.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: minSize + Math.random() * (maxSize - minSize),
        color,
      });
    }
  }
}
