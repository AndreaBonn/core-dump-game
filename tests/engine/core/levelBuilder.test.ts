import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLevelState, drawPacketType } from '@/engine/core/levelBuilder';
import { getLevel } from '@/config/levels';
import { createRng } from '@/engine/math/rng';
import { BOARD_CENTER } from '@/config/paths';
import * as armor from '@/engine/core/armor';
import * as random from '@/engine/math/rng';

afterEach(() => {
  vi.restoreAllMocks();
});

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
    const fresh = createRng(config.seed);
    const draws = (rng: typeof fresh) =>
      Array.from({ length: 12 }, () => drawPacketType(rng, state.types));

    // A fresh rng on the same seed replays the chain's draws; the level rng
    // has moved past them, so the two streams differ.
    expect(draws(state.rng)).not.toEqual(draws(fresh));
  });

  it('builds the same chain every time a level is started', () => {
    const config = getLevel(2);

    const first = buildLevelState(config).chain.packets.map((packet) => packet.type);
    const second = buildLevelState(config).chain.packets.map((packet) => packet.type);

    expect(first).toEqual(second);
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

describe('buildLevelState armor', () => {
  it.each([0, -0.3])('skips armor processing and the sub-rng at probability %s', (armorChance) => {
    const applyArmor = vi.spyOn(armor, 'applyArmor');
    const createRng = vi.spyOn(random, 'createRng');
    const config = { ...getLevel(5), armorChance };

    const plain = buildLevelState(config);

    expect(plain.chain.packets).toHaveLength(config.chainLength);
    expect(applyArmor).toHaveBeenCalledTimes(0);
    expect(createRng).toHaveBeenCalledTimes(1);
    expect(createRng).toHaveBeenCalledWith(config.seed);

    buildLevelState({ ...config, armorChance: 1 });

    expect(applyArmor).toHaveBeenCalledTimes(1);
    expect(createRng).toHaveBeenCalledTimes(3);
    expect(createRng).toHaveBeenLastCalledWith(armor.armorSeed(config.seed));
  });

  it('preserves packets, cursor types and the main rng when enabling armor', () => {
    const config = { ...getLevel(5), seed: 123456789, chainLength: 100 };
    const plain = buildLevelState({ ...config, armorChance: 0 });
    const armored = buildLevelState({ ...config, armorChance: 0.3 });

    expect(armored.chain.packets.map((p) => p.type)).toEqual(
      plain.chain.packets.map((p) => p.type),
    );
    expect(armored.chain.packets.map((p) => p.matchable)).toEqual(
      plain.chain.packets.map((p) => p.matchable),
    );
    expect(armored.chain.packets.map((p) => p.powerUpType)).toEqual(
      plain.chain.packets.map((p) => p.powerUpType),
    );
    expect(armored.chain.packets.map((p) => p.distance)).toEqual(
      plain.chain.packets.map((p) => p.distance),
    );
    expect(armored.cursor.currentType).toBe(plain.cursor.currentType);
    expect(armored.cursor.nextType).toBe(plain.cursor.nextType);
    expect(Array.from({ length: 12 }, () => armored.rng.next())).toEqual(
      Array.from({ length: 12 }, () => plain.rng.next()),
    );
    expect(armored.chain.packets.map((p) => p.armor)).toContain(1);
    expect(armored.chain.packets.map((p) => p.armor)).not.toEqual(
      plain.chain.packets.map((p) => p.armor),
    );
  });

  it('armors every eligible packet and excludes hazards and power-ups', () => {
    const config = {
      ...getLevel(5),
      seed: 123456789,
      chainLength: 100,
      armorChance: 1,
      hazardChance: 0.3,
      powerUpChance: 0.3,
    };
    const { packets } = buildLevelState(config).chain;
    const eligible = packets.filter((p) => p.matchable && p.powerUpType === null);
    const hazards = packets.filter((p) => !p.matchable);
    const powerUps = packets.filter((p) => p.powerUpType !== null);

    expect(eligible.length).toBeGreaterThan(0);
    expect(hazards.length).toBeGreaterThan(0);
    expect(powerUps.length).toBeGreaterThan(0);
    expect(eligible.map((p) => p.armor)).toEqual(eligible.map(() => 1));
    expect(hazards.map((p) => p.armor)).toEqual(hazards.map(() => 0));
    expect(powerUps.map((p) => p.armor)).toEqual(powerUps.map(() => 0));
  });

  it('builds the same armor twice for the same config', () => {
    const config = { ...getLevel(5), armorChance: 0.3, seed: 123456789, chainLength: 100 };
    const first = buildLevelState(config).chain.packets.map((p) => p.armor);
    const second = buildLevelState(config).chain.packets.map((p) => p.armor);

    expect(first).toContain(1);
    expect(first).toContain(0);
    expect(second).toEqual(first);
  });

  it('leaves every packet unarmored when armorChance is zero', () => {
    const config = { ...getLevel(5), armorChance: 0 };
    const { packets } = buildLevelState(config).chain;

    expect(packets).toHaveLength(config.chainLength);
    expect(packets.map((p) => p.armor)).toEqual(Array(config.chainLength).fill(0));
  });
});
