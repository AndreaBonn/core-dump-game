import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_COSMETICS } from '@/config/cosmetics';
import { colorForType } from '@/config/packetTypes';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { createPacket } from '@/engine/entities/DataPacket';
import { Path } from '@/engine/entities/Path';
import { Projectile } from '@/engine/entities/Projectile';
import { RenderSystem, type RenderScene } from '@/engine/systems/RenderSystem';
import { DEFAULT_THEME, themeFor } from '@/engine/systems/theme';
import { VisualFx } from '@/engine/systems/VisualFx';

function drawingContext(fills: unknown[], strokes: unknown[]): CanvasRenderingContext2D {
  return {
    set fillStyle(value: unknown) {
      fills.push(value);
    },
    set strokeStyle(value: unknown) {
      strokes.push(value);
    },
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  } as unknown as CanvasRenderingContext2D;
}

function sceneForTheme(): RenderScene {
  const path = new Path([
    { x: 20, y: 20 },
    { x: 500, y: 20 },
  ]);
  const projectile = new Projectile({ x: 150, y: 100 }, 0, 'INFO');
  const fx = new VisualFx();
  fx.trackProjectiles([projectile]);
  projectile.advance(0.01);
  fx.trackProjectiles([projectile]);
  return {
    path,
    packets: [createPacket({ type: 'ERROR', distance: 100 })],
    cursor: new CpuCursor({ x: 250, y: 200 }, 'SUCCESS', 'WARNING'),
    voidPosition: path.voidPosition,
    projectiles: [projectile],
    fx,
    trajectory: null,
    urgency: 0,
    reversalPhase: 0,
    theme: themeFor({ ...DEFAULT_COSMETICS, palette: 'okabe-ito' }),
  };
}

describe('RenderSystem theme', () => {
  it.each(['ERROR', 'INFO', 'SUCCESS'] as const)(
    'colors the packet, projectile and cursor via the scene theme (%s)',
    (type) => {
      const fills: unknown[] = [];
      const scene = sceneForTheme();
      const renderer = new RenderSystem(960, 600);
      const ctx = drawingContext(fills, []);
      renderer.render(ctx, scene);
      expect(fills).toContain(scene.theme.packetColor(type));
      expect(fills).not.toContain(colorForType(type));
      fills.length = 0;
      renderer.render(ctx, { ...scene, theme: DEFAULT_THEME });
      expect(fills).toContain(colorForType(type));
      expect(fills).not.toContain(scene.theme.packetColor(type));
    },
  );

  it('uses the projectile palette color for its tracer as well as its body', () => {
    const strokes: unknown[] = [];
    const scene = sceneForTheme();
    new RenderSystem(960, 600).render(drawingContext([], strokes), scene);
    expect(strokes).toContain(scene.theme.packetColor('INFO'));
    expect(strokes).not.toContain(colorForType('INFO'));
    new RenderSystem(960, 600).render(drawingContext([], strokes), {
      ...scene,
      theme: DEFAULT_THEME,
    });
    expect(strokes).toContain(colorForType('INFO'));
  });

  it('preserves classic for direct drawPacket calls without a theme', () => {
    const fills: unknown[] = [];
    const packet = createPacket({ type: 'ERROR', distance: 100 });
    new RenderSystem(960, 600).drawPacket(drawingContext(fills, []), packet, { x: 100, y: 20 });
    expect(fills).toContain(colorForType('ERROR'));
  });
});

describe('RenderSystem skin shapes', () => {
  it('uses the circle chain body while keeping its glyph centered', () => {
    const ctx = drawingContext([], []);
    const packet = createPacket({ type: 'ERROR', distance: 0 });
    const theme = { ...DEFAULT_THEME, chain: { id: 'circle' } };
    new RenderSystem(960, 600).drawPacket(ctx, packet, { x: 100, y: 20 }, 1, theme);
    expect(ctx.arc).toHaveBeenCalledExactlyOnceWith(100, 20, 16, 0, Math.PI * 2);
    expect(ctx.fillText).toHaveBeenCalledWith('E', 100, 21);
    expect(ctx.roundRect).not.toHaveBeenCalled();
    expect(vi.mocked(ctx.fill).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(ctx.fillText).mock.invocationCallOrder[0]!,
    );
  });

  it('preserves the classic packet geometry without an explicit theme', () => {
    const ctx = drawingContext([], []);
    const packet = createPacket({ type: 'INFO', distance: 0 });
    new RenderSystem(960, 600).drawPacket(ctx, packet, { x: 100, y: 20 });
    expect(ctx.roundRect).toHaveBeenCalledExactlyOnceWith(84, 4, 32, 32, 6.4);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('keeps hazards square even when the chain is circular', () => {
    const ctx = drawingContext([], []);
    const packet = createPacket({ type: 'INFO', distance: 0, matchable: false });
    const theme = { ...DEFAULT_THEME, chain: { id: 'circle' } };
    new RenderSystem(960, 600).drawPacket(ctx, packet, { x: 100, y: 20 }, 1, theme);
    expect(ctx.roundRect).toHaveBeenCalledExactlyOnceWith(84, 4, 32, 32, 6.4);
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('uses circle bodies for the projectile and each of its four trail samples', () => {
    const ctx = drawingContext([], []);
    const scene = sceneForTheme();
    const projectile = new Projectile({ x: 150, y: 100 }, 0, 'INFO');
    new RenderSystem(960, 600).render(ctx, {
      ...scene,
      packets: [],
      projectiles: [projectile],
      theme: { ...scene.theme, chain: { id: 'circle' } },
    });
    for (const [x, radius] of [
      [138.8, 13.76],
      [127.6, 11.52],
      [116.4, 9.28],
      [105.2, 7.04],
      [150, 16],
    ]) {
      expect(ctx.arc).toHaveBeenCalledWith(
        expect.closeTo(x!),
        100,
        expect.closeTo(radius!),
        0,
        Math.PI * 2,
      );
    }
    // Only the cursor body and its default loaded indicator remain square.
    expect(ctx.roundRect).toHaveBeenCalledTimes(2);
    expect(ctx.roundRect).toHaveBeenCalledWith(224, 174, 52, 52, 10.4);
    expect(ctx.roundRect).toHaveBeenCalledWith(238.8, 188.8, 22.4, 22.4, expect.closeTo(4.48));
  });

  it('draws a diamond loaded indicator while keeping the cursor body square', () => {
    const ctx = drawingContext([], []);
    const scene = sceneForTheme();
    new RenderSystem(960, 600).render(ctx, {
      ...scene,
      packets: [],
      projectiles: [],
      theme: { ...scene.theme, cursor: { id: 'diamond' } },
    });
    expect(ctx.moveTo).toHaveBeenCalledWith(250, 188.8);
    expect(ctx.lineTo).toHaveBeenCalledWith(261.2, 200);
    expect(ctx.lineTo).toHaveBeenCalledWith(250, 211.2);
    expect(ctx.lineTo).toHaveBeenCalledWith(238.8, 200);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.roundRect).toHaveBeenCalledExactlyOnceWith(224, 174, 52, 52, 10.4);
  });
});
