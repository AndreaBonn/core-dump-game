import { describe, expect, it, vi } from 'vitest';
import { PACKET_RADIUS } from '@/config/constants';
import { PACKET_TYPES } from '@/config/packetTypes';
import { createPacket } from '@/engine/entities/DataPacket';
import { RenderSystem } from '@/engine/systems/RenderSystem';

function drawingContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
  } as unknown as CanvasRenderingContext2D;
}

describe('armored packet rendering', () => {
  it.each(PACKET_TYPES)(
    'outlines armored $type packets and removes the outline after a crack',
    ({ type, label }) => {
      const ctx = drawingContext();
      const renderer = new RenderSystem(960, 600);
      const packet = createPacket({ type, distance: 0, armor: 1 });
      renderer.drawPacket(ctx, packet, { x: 100, y: 200 });
      expect(ctx.strokeRect).toHaveBeenCalledTimes(4);
      expect(ctx.fillText).toHaveBeenCalledWith(label, 100, 201);

      vi.mocked(ctx.strokeRect).mockClear();
      renderer.drawPacket(ctx, { ...packet, armor: 0 }, { x: 100, y: 200 });
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    },
  );

  it('keeps the armor centered and scaled with the packet', () => {
    const ctx = drawingContext();
    const renderer = new RenderSystem(960, 600);
    const packet = createPacket({ type: 'INFO', distance: 0, armor: 1 });
    renderer.drawPacket(ctx, packet, { x: 100, y: 200 }, 0.5);
    const radius = PACKET_RADIUS * 0.45;
    expect(ctx.strokeRect).toHaveBeenCalledWith(100 - radius, 200 - radius, radius * 2, radius * 2);
  });
});
