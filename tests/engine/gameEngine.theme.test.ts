import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_COSMETICS } from '@/config/cosmetics';
import { colorForType } from '@/config/packetTypes';
import { GameEngine } from '@/engine/GameEngine';
import type { LevelSession } from '@/engine/LevelSession';
import { createPacket } from '@/engine/entities/DataPacket';
import { createSessionBoard } from '../helpers/sessionBoard';
import { DEFAULT_THEME, themeFor } from '@/engine/systems/theme';
import type { VisualFx } from '@/engine/systems/VisualFx';
import { createCanvasMock } from '../helpers/canvasMock';
import { createNoopEngineEvents } from '../helpers/engineEvents';

interface ThemeInternals {
  session: LevelSession;
  fx: VisualFx;
  fire: () => void;
  fixedUpdate: (dt: number) => void;
}

const engines: GameEngine[] = [];
const selectedTheme = themeFor({ ...DEFAULT_COSMETICS, palette: 'okabe-ito' });

function createEngine(): { engine: GameEngine; fills: unknown[]; internals: ThemeInternals } {
  const canvas = createCanvasMock();
  const fills: unknown[] = [];
  const ctx = canvas.getContext('2d')!;
  const recording = new Proxy(ctx, {
    set: (_target, property, value) => {
      if (property === 'fillStyle') fills.push(value);
      return true;
    },
  });
  Object.defineProperty(canvas, 'getContext', { value: () => recording });
  const engine = new GameEngine(canvas, createNoopEngineEvents());
  engines.push(engine);
  engine.startRun();
  return { engine, fills, internals: engine as unknown as ThemeInternals };
}

afterEach(() => {
  for (const engine of engines.splice(0)) engine.destroy();
});

describe('GameEngine theme', () => {
  it('threads a changed theme through the presenter to canvas without changing another engine', () => {
    const first = createEngine();
    const second = createEngine();
    const type = first.internals.session.cursor.currentType;
    first.engine.setTheme(selectedTheme);
    first.engine.resize(960, 600, 1);
    second.engine.resize(960, 600, 1);
    expect(first.fills).toContain(selectedTheme.packetColor(type));
    expect(second.fills).toContain(colorForType(type));
    expect(second.fills).not.toContain(selectedTheme.packetColor(type));
    first.fills.length = 0;
    first.engine.setTheme(DEFAULT_THEME);
    first.engine.resize(960, 600, 1);
    expect(first.fills).toContain(colorForType(type));
  });

  it('colors shot impacts without changing the next seeded cursor draws', () => {
    const themed = createEngine();
    const classic = createEngine();
    themed.engine.setTheme(selectedTheme);
    for (let shot = 0; shot < 10; shot += 1) {
      const type = themed.internals.session.cursor.currentType;
      themed.internals.fire();
      classic.internals.fire();
      expect(themed.internals.fx.activeRipples.at(-1)?.color).toBe(selectedTheme.packetColor(type));
      expect(classic.internals.fx.activeRipples.at(-1)?.color).toBe(colorForType(type));
      expect(themed.internals.session.cursor.currentType).toBe(
        classic.internals.session.cursor.currentType,
      );
      expect(themed.internals.session.cursor.nextType).toBe(
        classic.internals.session.cursor.nextType,
      );
    }
  });

  it('colors a real insertion impact from the selected palette', () => {
    const { engine, internals } = createEngine();
    engine.setTheme(selectedTheme);
    internals.session = createSessionBoard([createPacket({ type: 'INFO', distance: 200 })]);
    internals.session.cursor.currentType = 'FATAL';
    internals.session.fire();
    internals.fixedUpdate(0);
    expect(internals.fx.activeRipples[0]?.color).toBe(selectedTheme.packetColor('FATAL'));
    expect(internals.session.chain.packets.some(({ type }) => type === 'FATAL')).toBe(true);
  });
});
