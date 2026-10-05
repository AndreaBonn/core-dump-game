import type { ComboLabel } from '@/types/game.types';

/**
 * Terminal-flavoured label for a combo of `explosions` consecutive matches
 * (spec 6). A single explosion is not a combo and returns null.
 */
export function comboLabel(explosions: number): ComboLabel | null {
  if (explosions < 2) {
    return null;
  }
  const id = explosions === 2 ? 'segfault' : explosions === 3 ? 'stackOverflow' : 'kernelPanic';
  return { multiplier: explosions, id };
}
