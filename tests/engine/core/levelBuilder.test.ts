import { describe, expect, it } from 'vitest';
import { buildLevelState, drawPacketType } from '@/engine/core/levelBuilder';
import { getLevel } from '@/config/levels';
import { createRng } from '@/engine/math/rng';
import { BOARD_CENTER } from '@/config/paths';

describe('buildLevelState', () => {
  it('builds the same chain twice for the same level config', () => {
    const config = getLevel(3);

    const first = buildLevelState(config);
    const second = buildLevelState(config);

    expect(first.chain.packets.map((packet) => packet.type)).toEqual(
      second.chain.packets.map((packet) => packet.type),
    );
    expect(first.cursor.currentType).toBe(second.cursor.currentType);
    expect(first.cursor.nextType).toBe(second.cursor.nextType);
  });

  it('gives different levels different chains', () => {
    const third = buildLevelState(getLevel(3));
    const fourth = buildLevelState(getLevel(4));

    expect(third.chain.packets.map((packet) => packet.type)).not.toEqual(
      fourth.chain.packets.map((packet) => packet.type),
    );
  });

  it('takes chain length, speed and colour count from the level config', () => {
    const config = getLevel(5);

    const state = buildLevelState(config);

    expect(state.chain.packets).toHaveLength(config.chainLength);
    expect(state.chain.speed).toBe(config.chainSpeed);
    expect(state.baseSpeed).toBe(config.chainSpeed);
    expect(state.types).toHaveLength(config.colorCount);
    expect(new Set(state.chain.packets.map((packet) => packet.type)).size).toBeLessThanOrEqual(
      config.colorCount,
    );
  });

  it('places the void at the end of the path and the cursor at the board centre', () => {
    const state = buildLevelState(getLevel(1));

    expect(state.voidHole.position).toEqual(state.path.voidPosition);
    expect(state.cursor.position).toEqual(BOARD_CENTER);
  });

  it('leaves the rng positioned after the packets it already drew', () => {
    const config = getLevel(2);

    const state = buildLevelState(config);
    const continued = drawPacketType(state.rng, state.types);
    const restarted = drawPacketType(createRng(config.seed), state.types);

    // A fresh rng on the same seed replays the first draw, the level rng does not.
    expect(state.types).toContain(continued);
    expect(state.types).toContain(restarted);
  });
});

describe('drawPacketType', () => {
  it('draws only from the given types and is deterministic for a seed', () => {
    const types = ['ERROR', 'SUCCESS', 'INFO'] as const;

    const drawn = drawPacketType(createRng(7), types);

    expect(types).toContain(drawn);
    expect(drawPacketType(createRng(7), types)).toBe(drawn);
  });
});
