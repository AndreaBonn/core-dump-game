import { colorForType, PACKET_TYPES } from '@/config/packetTypes';
import type { PacketType } from '@/types/game.types';

export type CosmeticSlot = 'cursor' | 'chain' | 'palette';

export type CosmeticUnlock =
  | { readonly kind: 'default' }
  // Open to everyone without being the slot default: accessibility is never a reward.
  | { readonly kind: 'always' }
  | { readonly kind: 'rank'; readonly rank: number }
  | { readonly kind: 'stars'; readonly stars: number }
  | { readonly kind: 'bosses'; readonly bosses: number };

/** Every catalog id: stable, because selections are saved and dictionaries key on them. */
export type CosmeticId =
  | 'cursor-default'
  | 'ring'
  | 'diamond'
  | 'chain-default'
  | 'circle'
  | 'hex'
  | 'classic'
  | 'okabe-ito'
  | 'high-contrast'
  | 'neon';

export interface CosmeticItem {
  readonly id: CosmeticId;
  readonly slot: CosmeticSlot;
  readonly unlock: CosmeticUnlock;
}

export interface Palette extends CosmeticItem {
  readonly slot: 'palette';
  readonly colors: Readonly<Record<PacketType, string>>;
}

export type CosmeticSelection = Readonly<Record<CosmeticSlot, string>>;

const CURSORS: readonly CosmeticItem[] = [
  { id: 'cursor-default', slot: 'cursor', unlock: { kind: 'default' } },
  { id: 'ring', slot: 'cursor', unlock: { kind: 'rank', rank: 2 } },
  { id: 'diamond', slot: 'cursor', unlock: { kind: 'stars', stars: 6 } },
];

const CHAINS: readonly CosmeticItem[] = [
  { id: 'chain-default', slot: 'chain', unlock: { kind: 'default' } },
  { id: 'circle', slot: 'chain', unlock: { kind: 'rank', rank: 2 } },
  { id: 'hex', slot: 'chain', unlock: { kind: 'bosses', bosses: 1 } },
];

export const PALETTES: readonly Palette[] = [
  {
    id: 'classic',
    slot: 'palette',
    unlock: { kind: 'default' },
    colors: Object.fromEntries(
      PACKET_TYPES.map(({ type }) => [type, colorForType(type)]),
    ) as Record<PacketType, string>,
  },
  {
    id: 'okabe-ito',
    slot: 'palette',
    unlock: { kind: 'always' },
    colors: {
      ERROR: '#d55e00',
      SUCCESS: '#009e73',
      INFO: '#56b4e9',
      WARNING: '#f0e442',
      // Lift the original blue so the dark packet glyph meets 4.5:1 contrast.
      DEBUG: '#408fc1',
      TRACE: '#e69f00',
      FATAL: '#cc79a7',
    },
  },
  {
    id: 'high-contrast',
    slot: 'palette',
    unlock: { kind: 'always' },
    colors: {
      ERROR: '#ff9999',
      SUCCESS: '#99ff99',
      INFO: '#99ddff',
      WARNING: '#ffff99',
      DEBUG: '#ccbbff',
      TRACE: '#ffcc99',
      FATAL: '#ffbbdd',
    },
  },
  {
    id: 'neon',
    slot: 'palette',
    // The palette to earn: three chapter bosses down.
    unlock: { kind: 'bosses', bosses: 3 },
    colors: {
      ERROR: '#ff4d6d',
      SUCCESS: '#39ff14',
      INFO: '#00e5ff',
      WARNING: '#ffe600',
      DEBUG: '#b388ff',
      TRACE: '#ff9100',
      FATAL: '#ff5cd6',
    },
  },
];

export const COSMETICS: readonly CosmeticItem[] = [...CURSORS, ...CHAINS, ...PALETTES];

export const DEFAULT_COSMETICS: CosmeticSelection = {
  cursor: CURSORS[0]!.id,
  chain: CHAINS[0]!.id,
  palette: PALETTES[0]!.id,
};
