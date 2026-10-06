import { describe, expect, it } from 'vitest';
import { CHAPTERS, type LevelSpec } from '@/config/campaign';
import { buildCampaignLevel, getLevel, LEVELS, TOTAL_LEVELS } from '@/config/levels';
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
      // Two waves of 52: thresholds on all 104 packets.
      starThresholds: [620, 1040, 1560],
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

  it('rates a multi-wave level on every packet it sends, not on one wave', () => {
    const finale = getLevel(TOTAL_LEVELS);
    expect(finale.waves).toBe(4);
    expect(finale.chainLength).toBe(96);
    // 384 packets at 6, 10 and 15 points each, rounded to tens.
    expect(finale.starThresholds).toEqual([2300, 3840, 5760]);
  });

  it('keeps single-wave thresholds on the chain length alone', () => {
    // 20 packets at 6, 10 and 15 points each.
    expect(getLevel(1).starThresholds).toEqual([120, 200, 300]);
  });

  it('keeps chapters ordered and contiguous', () => {
    expect(LEVELS.map(({ chapter }) => chapter)).toEqual(
      CHAPTERS.flatMap(({ id, levels }) => levels.map(() => id)),
    );
  });

  it('numbers every campaign level consecutively from one', () => {
    const count = CHAPTERS.reduce((total, { levels }) => total + levels.length, 0);
    expect(LEVELS.map(({ level }) => level)).toEqual(
      Array.from({ length: count }, (_, index) => index + 1),
    );
  });

  it('takes every hazard chance from the chapter table, none before chapter two', () => {
    expect(LEVELS.map(({ hazardChance }) => hazardChance)).toEqual(
      CHAPTERS.flatMap(({ levels }) => levels.map(({ hazardChance }) => hazardChance)),
    );
    expect(
      LEVELS.filter(({ chapter }) => chapter === 1).map(({ hazardChance }) => hazardChance),
    ).toEqual([0, 0, 0, 0, 0, 0]);
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
