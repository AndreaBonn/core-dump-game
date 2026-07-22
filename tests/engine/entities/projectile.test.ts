import { beforeEach, describe, expect, it } from 'vitest';
import { Projectile, resetProjectileIds } from '@/engine/entities/Projectile';
import { PROJECTILE_SPEED } from '@/config/constants';
import { vec2 } from '@/engine/math/vec2';

beforeEach(() => {
  resetProjectileIds();
});

describe('Projectile', () => {
  it('starts at its origin', () => {
    const projectile = new Projectile(vec2(12, 34), 0, 'INFO');
    expect(projectile.position).toEqual({ x: 12, y: 34 });
  });

  it('derives velocity from the firing angle and PROJECTILE_SPEED', () => {
    const rightward = new Projectile(vec2(0, 0), 0, 'INFO');
    expect(rightward.velocity.x).toBeCloseTo(PROJECTILE_SPEED);
    expect(rightward.velocity.y).toBeCloseTo(0);

    const downward = new Projectile(vec2(0, 0), Math.PI / 2, 'INFO');
    expect(downward.velocity.x).toBeCloseTo(0);
    expect(downward.velocity.y).toBeCloseTo(PROJECTILE_SPEED);
  });

  it('advances its position by velocity * dt', () => {
    const projectile = new Projectile(vec2(0, 0), 0, 'INFO');
    projectile.advance(0.5);
    expect(projectile.position.x).toBeCloseTo(PROJECTILE_SPEED * 0.5);
    expect(projectile.position.y).toBeCloseTo(0);
  });

  it('preserves the packet type it carries', () => {
    expect(new Projectile(vec2(0, 0), 0, 'ERROR').type).toBe('ERROR');
  });

  it('assigns incrementing ids that reset on demand', () => {
    expect(new Projectile(vec2(0, 0), 0, 'INFO').id).toBe(1);
    expect(new Projectile(vec2(0, 0), 0, 'INFO').id).toBe(2);
    resetProjectileIds();
    expect(new Projectile(vec2(0, 0), 0, 'INFO').id).toBe(1);
  });
});
