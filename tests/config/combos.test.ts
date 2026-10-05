import { describe, expect, it } from 'vitest';
import { comboLabel } from '@/config/combos';

describe('comboLabel', () => {
  it('returns null for a single explosion', () => {
    expect(comboLabel(1)).toBeNull();
  });

  it('labels a two-explosion combo SEGFAULT', () => {
    expect(comboLabel(2)).toEqual({ multiplier: 2, id: 'segfault' });
  });

  it('labels a three-explosion combo STACK OVERFLOW', () => {
    expect(comboLabel(3)).toEqual({ multiplier: 3, id: 'stackOverflow' });
  });

  it('labels four or more explosions KERNEL PANIC', () => {
    expect(comboLabel(4)).toEqual({ multiplier: 4, id: 'kernelPanic' });
    expect(comboLabel(7)!.id).toBe('kernelPanic');
  });
});
