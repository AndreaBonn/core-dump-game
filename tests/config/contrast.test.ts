import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/config/contrast';

describe('contrastRatio', () => {
  it('measures black against white as 21:1 in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
  });

  it('distinguishes nearby grays from a legible light and dark pair', () => {
    expect(contrastRatio('#777777', '#888888')).toBeLessThan(3);
    expect(contrastRatio('#222222', '#dddddd')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('uses linearized sRGB luminance with the standard channel weights', () => {
    expect(contrastRatio('#ff0000', '#ffffff')).toBeCloseTo(3.9985, 3);
    expect(contrastRatio('#0a0a0a', '#ffffff')).toBeCloseTo(19.7981, 3);
  });
});
