import { describe, expect, it } from 'vitest';
import { buildLevelConfig } from '@/config/levels';
import type { LevelSession, SessionEvent } from '@/engine/LevelSession';
import { createPacket } from '@/engine/entities/DataPacket';
import { createSessionBoard, fireSessionShot } from '../helpers/sessionBoard';

const CONFIG = { ...buildLevelConfig(1, 12345), waves: 3 };
const MATCH_SCORE = 30;

function clearChain(session: LevelSession): SessionEvent[] {
  session.chain.packets.splice(
    0,
    session.chain.packets.length,
    createPacket({ type: 'ERROR', distance: 200 }),
    createPacket({ type: 'ERROR', distance: 216 }),
  );
  return fireSessionShot(session);
}

describe('LevelSession waves', () => {
  it('refills twice and clears only after the third clear', () => {
    const session = createSessionBoard([], CONFIG);
    const { chain, path } = session;
    for (const wave of [2, 3]) {
      const events = clearChain(session);
      expect(session.chain).toBe(chain);
      expect(session.path).toBe(path);
      expect(chain.packets).toHaveLength(CONFIG.chainLength);
      expect(session.currentWave).toBe(wave);
      expect(events).toMatchObject([
        { kind: 'shot', outcome: { score: MATCH_SCORE } },
        { kind: 'wave', wave, total: 3 },
      ]);
    }
    expect(clearChain(session)).toMatchObject([
      { kind: 'shot', outcome: { score: MATCH_SCORE } },
      { kind: 'cleared' },
    ]);
    expect(chain.packets).toHaveLength(0);
  });

  it('completes a single-wave level on its first clear', () => {
    const session = createSessionBoard([], { ...CONFIG, waves: 1 });
    expect(clearChain(session)).toMatchObject([
      { kind: 'shot', outcome: { score: MATCH_SCORE } },
      { kind: 'cleared' },
    ]);
    expect(session.chain.packets).toHaveLength(0);
  });
});
