import { describe, expect, it } from 'vitest';
import { CHAPTERS, type LevelSpec } from '@/config/campaign';
import { buildCampaignLevel, LEVELS } from '@/config/levels';
import { buildTrack } from '@/config/paths';

const CUSTOM_BOSS_SPEC: LevelSpec = {
  chainLength: 52,
  colorCount: 7,
  chainSpeed: 66,
  turns: 3.56,
  hazardChance: 0.1,
  armorChance: 0.25,
  reversal: { period: 20, duration: 3, factor: 0.5 },
  waves: 2,
};

describe('playable campaign chapters', () => {
  it('builds authored mechanics, track, seed and star thresholds for a chapter boss', () => {
    const position = { level: 11, chapter: 3, index: 2, chapterLength: 3 };
    const config = buildCampaignLevel(CUSTOM_BOSS_SPEC, position);
    expect(config).toMatchObject({
      level: 11,
      chapter: 3,
      isBoss: true,
      chainLength: 52,
      colorCount: 7,
      chainSpeed: 66,
      hazardChance: 0.1,
      armorChance: 0.25,
      reversal: CUSTOM_BOSS_SPEC.reversal,
      waves: 2,
      powerUpChance: 0.05,
      pathKind: 'loop',
      seed: 88109,
      starThresholds: [310, 520, 780],
    });
    expect(config.waypoints).toEqual(
      buildTrack({ kind: 'loop', reach: 250, sweeps: 4, waypoints: 64 }),
    );
  });

  it('keeps fractional spiral turns and alternates the track radius', () => {
    const spec = CHAPTERS[0]!.levels[1]!;
    const position = { level: 2, chapter: 1, index: 1, chapterLength: 6 };
    const config = buildCampaignLevel(spec, position);
    expect(config.isBoss).toBe(false);
    expect(buildCampaignLevel(spec, { ...position, index: 5 }).isBoss).toBe(true);
    expect(config.waypoints).toEqual(
      buildTrack({ kind: 'spiral', reach: 270, sweeps: 2.72, waypoints: 64 }),
    );
  });

  it.each(CHAPTERS)('places exactly one boss last in chapter $id', (chapter) => {
    const levels = LEVELS.filter((level) => level.chapter === chapter.id);
    expect(levels).toHaveLength(chapter.levels.length);
    expect(levels.filter(({ isBoss }) => isBoss).map(({ level }) => level)).toEqual([
      levels.at(-1)!.level,
    ]);
  });

  it('keeps chapters ordered and contiguous', () => {
    expect(LEVELS.map(({ chapter }) => chapter)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
  });

  it('numbers every campaign level consecutively from one', () => {
    expect(LEVELS.map(({ level }) => level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('takes every hazard chance from the chapter table, none before chapter two', () => {
    expect(LEVELS.map(({ hazardChance }) => hazardChance)).toEqual([
      0, 0, 0, 0, 0, 0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12,
    ]);
  });

  it.each(CHAPTERS)('uses the authored tuning of chapter $id', (chapter) => {
    const levels = LEVELS.filter((level) => level.chapter === chapter.id);
    const tuning = chapter.levels.map((spec) => ({
      chainLength: spec.chainLength,
      colorCount: spec.colorCount,
      chainSpeed: spec.chainSpeed,
      armorChance: spec.armorChance,
      reversal: spec.reversal,
      waves: spec.waves,
    }));
    expect(levels).toMatchObject(tuning);
  });
});
