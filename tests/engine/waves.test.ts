import { describe, expect, it } from 'vitest';
import { buildLevelConfig, type LevelConfig } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { armorSeed } from '@/engine/core/armor';
import { buildWave, nextWave, waveCount, waveSeed } from '@/engine/core/waves';
import type { DataPacket } from '@/types/game.types';

const CONFIG: LevelConfig = {
  ...buildLevelConfig(10, 12345),
  waves: 3,
  chainLength: 100,
  colorCount: 3,
  powerUpChance: 0.2,
  hazardChance: 0.2,
  armorChance: 0.5,
};

function properties(packets: DataPacket[]): Omit<DataPacket, 'id'>[] {
  return packets.map(({ type, armor, matchable, powerUpType, distance, isPowerUp }) => ({
    type,
    armor,
    matchable,
    powerUpType,
    distance,
    isPowerUp,
  }));
}

describe('waveCount', () => {
  it.each([
    [1, 1],
    [3, 3],
    [0, 1],
    [NaN, 1],
    [-3, 1],
  ])('normalizes %s waves to %s', (waves, expected) => {
    expect(waveCount({ ...CONFIG, waves })).toBe(expected);
  });
});

describe('wave generation', () => {
  it('repeats packet properties for the same seed and wave index', () => {
    const first = properties(buildWave(CONFIG, 2));

    expect(properties(buildWave(CONFIG, 2))).toEqual(first);
    expect(first).toHaveLength(CONFIG.chainLength);
    expect(first.some((packet) => packet.armor > 0)).toBe(true);
    expect(first.some((packet) => !packet.matchable)).toBe(true);
    expect(first.some((packet) => packet.isPowerUp)).toBe(true);
    expect(first.every((packet) => typesForCount(CONFIG.colorCount).includes(packet.type))).toBe(
      true,
    );
  });

  it('separates subsequent waves and level seeds', () => {
    const second = properties(buildWave(CONFIG, 2));

    expect(properties(buildWave(CONFIG, 2))).toEqual(second);
    expect(properties(buildWave(CONFIG, 3))).not.toEqual(second);
    expect(properties(buildWave({ ...CONFIG, seed: CONFIG.seed + 1 }, 2))).not.toEqual(second);
  });

  it('uses a deterministic unsigned seed distinct from the armor stream', () => {
    const seed = waveSeed(CONFIG.seed, 2);

    expect(waveSeed(CONFIG.seed, 2)).toBe(seed);
    expect(seed).toBe(seed >>> 0);
    expect(seed).not.toBe(armorSeed(CONFIG.seed));
    expect(waveSeed(CONFIG.seed, 3)).not.toBe(seed);
  });

  it('honors disabled hazards, power-ups and armor without shifting packet layout', () => {
    const config = { ...CONFIG, hazardChance: 0, powerUpChance: 0 };
    const plain = buildWave({ ...config, armorChance: 0 }, 2);
    const armored = buildWave({ ...config, armorChance: 1 }, 2);
    const mixed = buildWave(CONFIG, 2);

    expect(
      plain.every((packet) => packet.matchable && !packet.isPowerUp && packet.armor === 0),
    ).toBe(true);
    expect(armored.every((packet) => packet.armor === 1)).toBe(true);
    expect(mixed.some((packet) => !packet.matchable)).toBe(true);
    expect(mixed.some((packet) => packet.isPowerUp)).toBe(true);
    expect(plain.map((packet) => packet.type)).toEqual(armored.map((packet) => packet.type));
  });
});

describe('nextWave', () => {
  it('returns the next index only while waves remain', () => {
    expect(nextWave(CONFIG, 1)).toMatchObject({ wave: 2, total: 3 });
    expect(nextWave(CONFIG, 2)).toMatchObject({ wave: 3, total: 3 });
    expect(nextWave(CONFIG, 1)?.packets).toHaveLength(CONFIG.chainLength);
    expect(nextWave(CONFIG, 3)).toBeNull();
    expect(nextWave({ ...CONFIG, waves: 1 }, 1)).toBeNull();
  });
});
