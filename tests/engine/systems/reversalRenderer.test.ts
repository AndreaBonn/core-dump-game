import { describe, expect, it, vi } from 'vitest';
import { drawReversal, reversalCuePhase } from '@/engine/systems/MechanicRenderer';
import { createCanvasMock } from '../../helpers/canvasMock';

describe('reversalCuePhase', () => {
  it('keeps normal motion proportional to the warning ramp', () => {
    expect(reversalCuePhase(0.25, false)).toBe(0.25);
    expect(reversalCuePhase(0.75, false)).toBe(0.75);
  });

  it('keeps reduced motion visible and static throughout the warning', () => {
    expect(reversalCuePhase(0.01, true)).toBe(1);
    expect(reversalCuePhase(0.5, true)).toBe(1);
    expect(reversalCuePhase(1, true)).toBe(1);
    expect(reversalCuePhase(0, true)).toBe(0);
  });
});

describe('drawReversal', () => {
  it('draws a direction cue during the warning and nothing outside it', () => {
    const ctx = createCanvasMock().getContext('2d')!;
    const stroke = vi.fn();
    const recording = new Proxy(ctx, {
      get: (target, key) => (key === 'stroke' ? stroke : target[key as keyof typeof target]),
    });
    drawReversal(recording, { x: 100, y: 100 }, 1);
    expect(stroke).toHaveBeenCalled();
    stroke.mockClear();
    drawReversal(recording, { x: 100, y: 100 }, 0);
    expect(stroke).not.toHaveBeenCalled();
  });
});
