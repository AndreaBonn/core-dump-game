import { describe, expect, it } from 'vitest';
import { CAMPAIGN_SEED_BASE, getLevel } from '@/config/levels';
import { buildLevelState } from '@/engine/core/levelBuilder';
import golden from './__fixtures__/levels-golden.json';

// Levels 4-5 used to carry hazards, which chapter one no longer has, so only
// the hazard-free opening keeps its exact chains for existing players.
const COMPATIBLE_LEVEL_COUNT = 3;
const originalLevels = golden.filter(
  ({ level, seedBase }) => seedBase === CAMPAIGN_SEED_BASE && level <= COMPATIBLE_LEVEL_COUNT,
);

describe('campaign chain compatibility', () => {
  it('checks the hazard-free original opening levels', () => {
    expect(originalLevels.map(({ level }) => level)).toEqual([1, 2, 3]);
  });

  it.each(originalLevels)('preserves every packet of original level $level', (original) => {
    const state = buildLevelState(getLevel(original.level));
    const packets = state.chain.packets.map(({ type, matchable, powerUpType, distance }) => ({
      type,
      matchable,
      powerUpType,
      distance,
    }));

    expect(packets).toEqual(original.packets);
  });
});
