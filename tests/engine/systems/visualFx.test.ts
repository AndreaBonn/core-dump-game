import { describe, expect, it } from 'vitest';
import type { ShotOutcome } from '@/engine/systems/ShotSystem';
import { VisualFx } from '@/engine/systems/VisualFx';

const IMPACT = { x: 100, y: 200 };
const COLOR = '#50fa7b';
const SHOT: ShotOutcome = {
  hit: true,
  insertedId: 1,
  score: 0,
  explosions: 0,
  combo: null,
  powerUps: [],
  bursts: [],
  clearedChain: false,
  cracked: 0,
};

describe('crack feedback', () => {
  it('gives a crack-only shot a lighter shake than an explosion', () => {
    const crack = new VisualFx();
    const explosion = new VisualFx();
    crack.reactToShot({ ...SHOT, cracked: 1 }, IMPACT, COLOR);
    explosion.reactToShot({ ...SHOT, explosions: 1 }, IMPACT, COLOR);

    expect(crack.shakeOffset()).toEqual({ x: 2, y: 0 });
    expect(explosion.shakeOffset()).toEqual({ x: 8, y: 0 });
    crack.update(1);
    expect(crack.shakeOffset()).toEqual({ x: 0, y: 0 });
  });

  it('adds no crack feedback without cracks or explosions, preserving the ordinary impact', () => {
    const fx = new VisualFx();
    fx.reactToShot(SHOT, IMPACT, COLOR);
    expect(fx.shakeOffset()).toEqual({ x: 0, y: 0 });
    expect(fx.activeParticles).toHaveLength(6);
    expect(fx.activeRipples).toHaveLength(1);

    fx.reactToShot({ ...SHOT, cracked: 1 }, IMPACT, COLOR);
    expect(fx.shakeOffset()).toEqual({ x: 2, y: 0 });
  });

  it('suppresses crack shake and moving impact effects with reduced motion', () => {
    const fx = new VisualFx();
    fx.setReducedMotion(true);
    fx.reactToShot({ ...SHOT, cracked: 1 }, IMPACT, COLOR);
    expect(fx.shakeOffset()).toEqual({ x: 0, y: 0 });
    expect(fx.activeParticles).toEqual([]);
    expect(fx.activeRipples).toEqual([]);

    fx.setReducedMotion(false);
    fx.reactToShot({ ...SHOT, cracked: 1 }, IMPACT, COLOR);
    expect(fx.shakeOffset()).toEqual({ x: 2, y: 0 });
    expect(fx.activeParticles).toHaveLength(6);
    expect(fx.activeRipples[0]).toMatchObject({ ...IMPACT, color: COLOR });
  });

  it('keeps the explosion feedback when a shot also cracks armor', () => {
    const fx = new VisualFx();
    fx.reactToShot(
      { ...SHOT, cracked: 1, explosions: 2, bursts: [{ point: IMPACT, color: COLOR }] },
      IMPACT,
      COLOR,
    );
    expect(fx.shakeOffset()).toEqual({ x: 12, y: 0 });
    expect(fx.activeParticles).toHaveLength(22);
    expect(fx.activeRipples).toHaveLength(2);
  });
});
