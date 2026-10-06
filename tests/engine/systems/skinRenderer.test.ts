import { describe, expect, it, vi } from 'vitest';
import { drawChainShape, drawCursorSkin } from '@/engine/systems/SkinRenderer';

function drawingContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  } as unknown as CanvasRenderingContext2D;
}

const bounds = { center: { x: 20, y: 30 }, radius: 10 };
const style = { color: '#abcdef', highlight: false };

describe('chain skin dispatch', () => {
  it.each(['chain-default', 'future-chain'])('draws %s as the classic rounded square', (id) => {
    const ctx = drawingContext();
    drawChainShape(ctx, { id }, bounds, style);
    expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 20, 20, 4);
    expect(ctx.fillStyle).toBe(style.color);
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it('draws a circle at the requested center and radius', () => {
    const ctx = drawingContext();
    drawChainShape(ctx, { id: 'circle' }, bounds, style);
    expect(ctx.arc).toHaveBeenCalledWith(20, 30, 10, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe(style.color);
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });

  it('draws the closed hexagonal path from its rightmost vertex', () => {
    const ctx = drawingContext();
    drawChainShape(ctx, { id: 'hex' }, bounds, style);
    expect(ctx.moveTo).toHaveBeenCalledWith(30, 30);
    expect(ctx.lineTo).toHaveBeenCalledTimes(5);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 25, expect.closeTo(38.66025403784439));
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.fillStyle).toBe(style.color);
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });

  it.each(['chain-default', 'circle', 'hex'])('preserves the common finish for %s', (id) => {
    const ctx = drawingContext();
    drawChainShape(ctx, { id }, bounds, { ...style, highlight: true });
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(10, 20, 10, 40);
    const gradient = vi.mocked(ctx.createLinearGradient).mock.results[0]!.value;
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(1, 0, 'rgba(255, 255, 255, 0.28)');
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(2, 0.45, 'rgba(255, 255, 255, 0)');
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(ctx.strokeStyle).toBe('rgba(0, 0, 0, 0.35)');
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it.each(['chain-default', 'circle', 'hex'])('omits only the sheen for an unlit %s', (id) => {
    const ctx = drawingContext();
    drawChainShape(ctx, { id }, bounds, style);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
  });
});

describe('cursor skin dispatch', () => {
  it.each(['cursor-default', 'future-cursor'])('draws %s as the highlighted square', (id) => {
    const ctx = drawingContext();
    drawCursorSkin(ctx, { id }, bounds, style.color);
    expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 20, 20, 4);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it('strokes a colored ring without filling its center', () => {
    const ctx = drawingContext();
    drawCursorSkin(ctx, { id: 'ring' }, bounds, style.color);
    expect(ctx.arc).toHaveBeenCalledWith(20, 30, 10, 0, Math.PI * 2);
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.strokeStyle).toBe(style.color);
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });

  it('fills a closed diamond with the loaded packet color', () => {
    const ctx = drawingContext();
    drawCursorSkin(ctx, { id: 'diamond' }, bounds, style.color);
    expect(ctx.moveTo).toHaveBeenCalledWith(20, 20);
    expect(vi.mocked(ctx.lineTo).mock.calls).toEqual([
      [30, 30],
      [20, 40],
      [10, 30],
    ]);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.fillStyle).toBe(style.color);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });
});
