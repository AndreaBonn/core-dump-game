import { describe, expect, it } from 'vitest';
import { reversalStep } from '@/engine/core/chainMotion';
import { Chain } from '@/engine/entities/Chain';
import { createPacket } from '@/engine/entities/DataPacket';

describe('reversalStep', () => {
  it.each([
    [2, -5, 0],
    [5, -2, 3],
    [0, -2, 0],
    [-5, 2, -3],
    [100, 20, 120],
    [5, 0, 5],
    // Already behind the entrance (a rollback put it there): reversal holds it, never pulls it forward.
    [-40, -3, -40],
  ])('moves from %s by %s to %s', (front, delta, expected) => {
    expect(reversalStep(front, delta)).toBe(expected);
  });
});

describe('Chain reversal clamp', () => {
  it('clamps the front while preserving the distance between packets', () => {
    const chain = new Chain(
      [createPacket({ type: 'INFO', distance: -11 }), createPacket({ type: 'ERROR', distance: 5 })],
      10,
    );
    chain.advance(-1);
    expect(chain.packets.map(({ distance }) => distance)).toEqual([-16, 0]);
    chain.advance(1);
    expect(chain.packets.map(({ distance }) => distance)).toEqual([-6, 10]);
  });

  it('never pulls a chain that a rollback left behind the entrance forward', () => {
    const chain = new Chain([createPacket({ type: 'INFO', distance: -40 })], 10);
    chain.advance(-0.5);
    expect(chain.frontDistance).toBe(-40);
  });

  it('allows the initial negative front to enter the path normally', () => {
    const chain = new Chain([createPacket({ type: 'INFO', distance: -16 })], 10);
    chain.advance(0.5);
    expect(chain.frontDistance).toBe(-11);
  });

  it('keeps an empty chain empty during reversal', () => {
    const chain = new Chain([createPacket({ type: 'INFO', distance: 5 })], 10);
    chain.advance(-0.1);
    expect(chain.frontDistance).toBe(4);
    const empty = new Chain([], 10);
    empty.advance(-1);
    expect(empty.packets).toEqual([]);
    expect(empty.frontDistance).toBe(-Infinity);
  });
});
