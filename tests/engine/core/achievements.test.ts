import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  achievementById,
  evaluate,
  newlyEarned,
  type AchievementState,
} from '@/engine/core/achievements';
import { EMPTY_PROGRESS, recordLevel } from '@/engine/core/progress';
import { EMPTY_STATS, type PlayerStats } from '@/engine/core/stats';
import { TOTAL_LEVELS } from '@/config/levels';

const NOTHING: AchievementState = { stats: EMPTY_STATS, progress: EMPTY_PROGRESS };

function withStats(stats: Partial<PlayerStats>): AchievementState {
  return { ...NOTHING, stats: { ...EMPTY_STATS, ...stats } };
}

function perfectCampaign(): AchievementState {
  let progress = EMPTY_PROGRESS;
  for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
    progress = recordLevel(progress, level, 3);
  }
  return { ...NOTHING, progress };
}

describe('the catalogue', () => {
  it('offers at least fifteen achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
  });

  it('has no duplicate ids', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('describes every entry with a name and a plain-words description', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.name.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });

  it('finds an achievement by id, and nothing by an unknown one', () => {
    expect(achievementById('hello-world')?.name).toBe('hello, world');
    expect(achievementById('not-a-thing')).toBeUndefined();
  });
});

describe('evaluate', () => {
  it('earns nothing on a fresh profile', () => {
    expect(evaluate(NOTHING)).toEqual([]);
  });

  it('earns the entry run achievements after one run', () => {
    const earned = evaluate(withStats({ runsPlayed: 1, levelsCleared: 1 }));

    expect(earned).toContain('hello-world');
    expect(earned).toContain('first-commit');
    expect(earned).not.toContain('uptime');
  });

  it.each([
    [2, 'segfault'],
    [3, 'stack-overflow'],
    [4, 'kernel-panic'],
  ])('earns the combo achievement at %i chained explosions', (bestCombo, id) => {
    expect(evaluate(withStats({ bestCombo }))).toContain(id);
    expect(evaluate(withStats({ bestCombo: bestCombo - 1 }))).not.toContain(id);
  });

  it('keeps the modes apart: an endless run does not complete the campaign', () => {
    const earned = evaluate(
      withStats({ bestLevel: { campaign: 0, endless: 30, daily: 0 }, runsPlayed: 1 }),
    );

    expect(earned).toContain('memory-leak');
    expect(earned).toContain('no-oom');
    expect(earned).not.toContain('root-access');
    expect(earned).not.toContain('halfway');
  });

  it('earns the perfect campaign only with every level at three stars', () => {
    expect(evaluate(perfectCampaign())).toContain('all-stars');
    expect(evaluate({ ...NOTHING, progress: recordLevel(EMPTY_PROGRESS, 1, 3) })).not.toContain(
      'all-stars',
    );
  });

  it('reads the best score across modes for the score achievement', () => {
    const earned = evaluate(withStats({ bestScore: { campaign: 500, endless: 12_000, daily: 0 } }));

    expect(earned).toContain('five-figures');
  });

  it('is stable: the same state always earns the same set', () => {
    const state = withStats({ runsPlayed: 12, bestCombo: 3 });

    expect(evaluate(state)).toEqual(evaluate(state));
  });
});

describe('newlyEarned', () => {
  it('reports only what was not earned before', () => {
    const state = withStats({ runsPlayed: 1, levelsCleared: 1 });

    expect(newlyEarned(state, ['hello-world'])).toEqual(['first-commit']);
  });

  it('reports nothing when everything earned is already known', () => {
    const state = withStats({ runsPlayed: 1 });

    expect(newlyEarned(state, evaluate(state))).toEqual([]);
  });

  it('does not re-award an achievement across two identical runs', () => {
    const first = withStats({ runsPlayed: 1, levelsCleared: 1 });
    const earned = newlyEarned(first, []);
    const second = withStats({ runsPlayed: 2, levelsCleared: 2 });

    expect(newlyEarned(second, earned)).toEqual([]);
  });
});
