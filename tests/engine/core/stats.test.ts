import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATS,
  recordCombo,
  recordLevelCleared,
  recordPowerUp,
  recordRun,
  type PlayerStats,
} from '@/engine/core/stats';
import type { RunResult } from '@/types/game.types';

function run(overrides: Partial<RunResult> = {}): RunResult {
  return {
    mode: 'campaign',
    score: 500,
    levelReached: 3,
    levelScore: 200,
    won: false,
    ...overrides,
  };
}

describe('recordRun', () => {
  it('counts the run and remembers the score for its mode', () => {
    const stats = recordRun(EMPTY_STATS, run({ mode: 'endless', score: 800, levelReached: 12 }));

    expect(stats.runsPlayed).toBe(1);
    expect(stats.bestScore.endless).toBe(800);
    expect(stats.bestLevel.endless).toBe(12);
  });

  it('keeps the modes apart, so an endless score is not a campaign record', () => {
    const stats = recordRun(EMPTY_STATS, run({ mode: 'endless', score: 5000 }));

    expect(stats.bestScore.campaign).toBe(0);
    expect(stats.bestScore.daily).toBe(0);
  });

  it('keeps the best score, not the latest', () => {
    const after = [run({ score: 900 }), run({ score: 100 })].reduce(recordRun, EMPTY_STATS);

    expect(after.bestScore.campaign).toBe(900);
    expect(after.runsPlayed).toBe(2);
  });

  it('counts a won run in both totals', () => {
    const stats = recordRun(EMPTY_STATS, run({ won: true }));

    expect(stats.runsPlayed).toBe(1);
    expect(stats.runsWon).toBe(1);
  });

  it('ignores the tutorial, so a teaching level never enters the records', () => {
    const played = recordRun(EMPTY_STATS, run({ mode: 'campaign', score: 500 }));

    const afterTutorial = recordRun(played, run({ mode: 'tutorial', score: 9999, won: true }));

    expect(afterTutorial).toBe(played);
    expect(afterTutorial.runsPlayed).toBe(1);
  });

  it('leaves the stats it was given untouched', () => {
    const before: PlayerStats = EMPTY_STATS;

    recordRun(before, run({ score: 4242 }));

    expect(before.runsPlayed).toBe(0);
    expect(before.bestScore.campaign).toBe(0);
  });
});

describe('recordCombo', () => {
  it('keeps the largest combo ever chained', () => {
    const stats = [4, 2, 7, 3].reduce(recordCombo, EMPTY_STATS);

    expect(stats.bestCombo).toBe(7);
  });

  it('returns the same stats when the combo does not beat the record', () => {
    const withRecord = recordCombo(EMPTY_STATS, 5);

    expect(recordCombo(withRecord, 5)).toBe(withRecord);
  });
});

describe('recordLevelCleared and recordPowerUp', () => {
  it('count each occurrence', () => {
    let stats = EMPTY_STATS;
    stats = recordLevelCleared(recordLevelCleared(stats));
    stats = recordPowerUp(stats);

    expect(stats.levelsCleared).toBe(2);
    expect(stats.powerUpsTriggered).toBe(1);
  });
});
