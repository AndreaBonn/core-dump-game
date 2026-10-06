import { describe, expect, it } from 'vitest';
import { COSMETICS, DEFAULT_COSMETICS, type CosmeticSlot } from '@/config/cosmetics';
import {
  cosmeticStateFor,
  isUnlocked,
  resolveCosmetic,
  unlockedCosmetics,
  type CosmeticState,
} from '@/engine/core/cosmeticUnlocks';
import { EMPTY_STATS } from '@/engine/core/stats';

const ZERO: CosmeticState = { rankIndex: 0, totalStars: 0, bossesCleared: 0 };
const THRESHOLDS = [
  { id: 'ring', field: 'rankIndex', threshold: 2, unlock: { kind: 'rank', rank: 2 } },
  { id: 'diamond', field: 'totalStars', threshold: 6, unlock: { kind: 'stars', stars: 6 } },
  { id: 'neon', field: 'bossesCleared', threshold: 3, unlock: { kind: 'bosses', bosses: 3 } },
  { id: 'hex', field: 'bossesCleared', threshold: 1, unlock: { kind: 'bosses', bosses: 1 } },
] as const;

describe('cosmetic unlocks', () => {
  it('unlocks exactly the defaults and the always-on items for a zero state', () => {
    const defaults = COSMETICS.filter(({ unlock }) => unlock.kind === 'default');
    const free = COSMETICS.filter(({ unlock }) => unlock.kind === 'always');
    expect(defaults).toHaveLength(3);
    expect(free.map(({ id }) => id)).toEqual(['okabe-ito', 'high-contrast']);
    expect(unlockedCosmetics(ZERO)).toEqual(
      COSMETICS.filter(({ unlock }) => unlock.kind === 'default' || unlock.kind === 'always'),
    );
  });

  it.each(THRESHOLDS)(
    'unlocks $id exactly at its catalog threshold',
    ({ id, field, threshold, unlock }) => {
      const item = COSMETICS.find((candidate) => candidate.id === id)!;
      expect(item.unlock).toEqual(unlock);
      const below = { ...ZERO, [field]: threshold - 1 };
      const reached = { ...ZERO, [field]: threshold };
      expect(isUnlocked(item, below)).toBe(false);
      expect(isUnlocked(item, reached)).toBe(true);
      expect(unlockedCosmetics(below)).not.toContain(item);
      expect(unlockedCosmetics(reached)).toContain(item);
    },
  );

  it.each(['cursor', 'chain', 'palette'] as const)(
    'falls back for missing or locked %s choices',
    (slot: CosmeticSlot) => {
      const unlocked = unlockedCosmetics(ZERO);
      const locked = COSMETICS.find((item) => item.slot === slot && !isUnlocked(item, ZERO))!;
      expect(resolveCosmetic(slot, 'missing', unlocked)).toBe(DEFAULT_COSMETICS[slot]);
      expect(resolveCosmetic(slot, locked.id, unlocked)).toBe(DEFAULT_COSMETICS[slot]);
      expect(resolveCosmetic(slot, locked.id, [...unlocked, locked])).toBe(locked.id);
    },
  );

  it('rejects an unlocked choice from another slot and keeps a matching choice', () => {
    const unlocked = unlockedCosmetics({ rankIndex: 8, totalStars: 90, bossesCleared: 5 });
    expect(resolveCosmetic('cursor', 'okabe-ito', unlocked)).toBe(DEFAULT_COSMETICS.cursor);
    expect(resolveCosmetic('palette', 'okabe-ito', unlocked)).toBe('okabe-ito');
    expect(resolveCosmetic('chain', 'missing', [])).toBe(DEFAULT_COSMETICS.chain);
  });

  it('derives rank three, twenty stars and one boss from a concrete profile', () => {
    // 1200 clear XP + 1000 star XP + 300 boss XP + 375 achievement XP = 2875 (rank 3).
    const profile = {
      stats: { ...EMPTY_STATS, levelsCleared: 12 },
      progress: {
        stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 3, 8: 1, 12: 0 },
        unlockedThrough: 13,
      },
      earned: ['hello-world', 'first-commit', 'sudo', 'boss-down', 'three-stars'],
    } as const;
    expect(cosmeticStateFor(profile)).toEqual({ rankIndex: 3, totalStars: 20, bossesCleared: 1 });
  });
});
