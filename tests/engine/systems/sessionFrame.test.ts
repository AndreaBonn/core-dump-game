import { describe, expect, it } from 'vitest';
import { getLevel } from '@/config/levels';
import { LevelSession } from '@/engine/LevelSession';
import { frameFor } from '@/engine/systems/sessionFrame';
import { DEFAULT_THEME } from '@/engine/systems/theme';
import { VisualFx } from '@/engine/systems/VisualFx';

describe('frameFor', () => {
  it('draws what the session holds, with the engine presentation on top', () => {
    const session = new LevelSession(getLevel(19));
    const fx = new VisualFx();

    const frame = frameFor(session, {
      phase: 'playing',
      fx,
      reducedMotion: true,
      theme: DEFAULT_THEME,
    });

    expect(frame).toEqual({
      phase: 'playing',
      path: session.path,
      chain: session.chain,
      voidPosition: session.voidPosition,
      cursor: session.cursor,
      projectiles: session.projectiles,
      fx,
      reversalPhase: session.reversalPhase,
      reducedMotion: true,
      theme: DEFAULT_THEME,
    });
  });
});
