import { DEFAULT_COSMETICS, PALETTES, type CosmeticSelection } from '@/config/cosmetics';
import type { PacketType } from '@/types/game.types';

export interface CursorSkin {
  readonly id: string;
}

export interface ChainSkin {
  readonly id: string;
}

export interface Theme {
  readonly packetColor: (type: PacketType) => string;
  readonly cursor: CursorSkin;
  readonly chain: ChainSkin;
}

/** Build an isolated visual theme; unknown palettes use classic, unlocks are resolved upstream. */
export function themeFor(selection: CosmeticSelection): Theme {
  const palette = PALETTES.find(({ id }) => id === selection.palette) ?? PALETTES[0]!;
  return {
    packetColor: (type) => palette.colors[type],
    cursor: { id: selection.cursor },
    chain: { id: selection.chain },
  };
}

export const DEFAULT_THEME: Theme = themeFor(DEFAULT_COSMETICS);
