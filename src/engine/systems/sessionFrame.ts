import type { LevelSession } from '@/engine/LevelSession';
import type { Frame } from '@/engine/systems/EngineRenderer';

/** What the engine adds to a frame: everything the session does not own. */
export type FramePresentation = Pick<Frame, 'phase' | 'fx' | 'reducedMotion' | 'theme'>;

/** The frame to draw: the session's board, with the engine's presentation on top. */
export function frameFor(session: LevelSession, presentation: FramePresentation): Frame {
  return {
    ...presentation,
    path: session.path,
    chain: session.chain,
    voidPosition: session.voidPosition,
    cursor: session.cursor,
    projectiles: session.projectiles,
    reversalPhase: session.reversalPhase,
  };
}
