import type { LevelConfig } from '@/config/levels';

const LENGTH_WEIGHT = 2;
const SPEED_WEIGHT = 3;
const COLOR_WEIGHT = 1;
// Unmatchable hazards disrupt more shots than armor that needs one extra match.
const HAZARD_RISK_WEIGHT = 2;
const ARMOR_RISK_WEIGHT = 1;
const REVERSAL_PENALTY = 40;
const EXTRA_WAVE_PENALTY = 60;
const SINGLE_WAVE = 1;
const BASE_RISK = 1;

/**
 * A single number that orders levels by how hard they play, so the campaign
 * curve can be checked by tests. It is monotonic in every parameter and has no
 * meaning on its own: it is never shown to the player.
 */
export function difficultyIndex(config: LevelConfig): number {
  const pressure =
    config.chainLength * LENGTH_WEIGHT +
    config.chainSpeed * SPEED_WEIGHT +
    config.colorCount * COLOR_WEIGHT;
  const risk =
    BASE_RISK + config.hazardChance * HAZARD_RISK_WEIGHT + config.armorChance * ARMOR_RISK_WEIGHT;
  const reversal = config.reversal === null ? 0 : REVERSAL_PENALTY;
  return pressure * risk + reversal + (config.waves - SINGLE_WAVE) * EXTRA_WAVE_PENALTY;
}
