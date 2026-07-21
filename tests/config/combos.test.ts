import { describe, expect, it } from 'vitest';
import { comboLabel } from '@/config/combos';

describe('comboLabel', () => {
  it('returns null for a single explosion', () => {
    expect(comboLabel(1)).toBeNull();
  });

  it('labels a two-explosion combo SEGFAULT', () => {
    expect(comboLabel(2)).toEqual({ multiplier: 2, text: 'SEGFAULT!' });
  });

  it('labels a three-explosion combo STACK OVERFLOW', () => {
    expect(comboLabel(3)).toEqual({ multiplier: 3, text: 'STACK OVERFLOW!' });
  });

  it('labels four or more explosions KERNEL PANIC', () => {
    expect(comboLabel(4)).toEqual({ multiplier: 4, text: 'KERNEL PANIC!!' });
    expect(comboLabel(7)!.text).toBe('KERNEL PANIC!!');
  });
});
