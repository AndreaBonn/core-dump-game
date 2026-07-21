import type { ComboLabel } from '@/types/game.types';

/**
 * Terminal-flavoured label for a combo of `explosions` consecutive matches
 * (spec 6). A single explosion is not a combo and returns null.
 */
export function comboLabel(explosions: number): ComboLabel | null {
  if (explosions < 2) {
    return null;
  }
  const text = explosions === 2 ? 'SEGFAULT!' : explosions === 3 ? 'STACK OVERFLOW!' : 'KERNEL PANIC!!';
  return { multiplier: explosions, text };
}
