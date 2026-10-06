import type { LevelConfig } from '@/config/levels';
import { typesForCount } from '@/config/packetTypes';
import { applyArmor, armorSeed } from '@/engine/core/armor';
import { generateChainPackets } from '@/engine/core/chainOps';
import { createRng } from '@/engine/math/rng';
import type { DataPacket } from '@/types/game.types';

const FIRST_WAVE = 1;
const WAVE_SEED_MULTIPLIER = 0x45d9f3b;
const WAVE_SEED_SHIFT = 16;

/** Clamp zero, negative or NaN wave counts to a playable single wave. */
export function waveCount(config: LevelConfig): number {
  return config.waves >= FIRST_WAVE ? config.waves : FIRST_WAVE;
}

/** Derive a dedicated unsigned seed without consuming the level's RNG stream. */
export function waveSeed(seed: number, index: number): number {
  let hash = (seed + Math.imul(index, WAVE_SEED_MULTIPLIER)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> WAVE_SEED_SHIFT), WAVE_SEED_MULTIPLIER);
  hash = Math.imul(hash ^ (hash >>> WAVE_SEED_SHIFT), WAVE_SEED_MULTIPLIER);
  hash ^= hash >>> WAVE_SEED_SHIFT;
  return hash >>> 0;
}

/** Build a subsequent wave (1-based index >= 2), preserving the level's tuning. */
export function buildWave(config: LevelConfig, index: number): DataPacket[] {
  const seed = waveSeed(config.seed, index);
  const packets = generateChainPackets({
    count: config.chainLength,
    types: typesForCount(config.colorCount),
    rng: createRng(seed),
    powerUpChance: config.powerUpChance,
    hazardChance: config.hazardChance,
  });
  return config.armorChance > 0
    ? applyArmor(packets, config.armorChance, createRng(armorSeed(seed)))
    : packets;
}

interface WaveTransition {
  wave: number;
  total: number;
  packets: DataPacket[];
}

/** Return a fresh wave, or null when the cleared wave completes the level. */
export function nextWave(config: LevelConfig, currentWave: number): WaveTransition | null {
  const total = waveCount(config);
  if (currentWave >= total) {
    return null;
  }
  const wave = currentWave + 1;
  return { wave, total, packets: buildWave(config, wave) };
}
