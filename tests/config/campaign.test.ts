import { describe, expect, it } from 'vitest';
import { CHAPTERS, type ChapterSpec, type LevelSpec } from '@/config/campaign';
import { difficultyIndex } from '@/config/difficulty';
import {
  buildLevelConfig,
  MAX_CHAIN_LENGTH,
  MAX_CHAIN_SPEED,
  MAX_COLOR_COUNT,
  MAX_HAZARD_CHANCE,
  MAX_TURNS,
} from '@/config/levels';

const LEVELS_PER_CHAPTER = 6;
const BOSS_INDEX = LEVELS_PER_CHAPTER - 1;
const MIN_BOSS_RATIO = 1.15;
// A boss is a peak, not a wall: past this, speed alone decides the level.
const MAX_BOSS_SPEED_RATIO = 1.25;
// A reversal is a stumble, not a retreat: the chain must not give back more than it gains.
const MIN_REVERSAL_FACTOR = -0.6;
const MAX_REVERSAL_SECONDS = 2;
const BASE = buildLevelConfig(1, 12345);

function indexFor(spec: LevelSpec): number {
  return difficultyIndex({ ...BASE, ...spec });
}

function chapterFor(id: number): ChapterSpec {
  const chapter = CHAPTERS.find((entry) => entry.id === id);
  expect(chapter).toBeDefined();
  return chapter!;
}

describe('campaign chapters', () => {
  it('defines the base, hazard, armor and reversal chapters in order', () => {
    expect(CHAPTERS.map(({ id, mechanic }) => ({ id, mechanic }))).toEqual([
      { id: 1, mechanic: 'base' },
      { id: 2, mechanic: 'hazard' },
      { id: 3, mechanic: 'armor' },
      { id: 4, mechanic: 'reversal' },
    ]);
  });

  it.each([1, 2, 3, 4])('gives chapter %i six levels', (id) => {
    expect(chapterFor(id).levels).toHaveLength(LEVELS_PER_CHAPTER);
  });

  it.each([1, 2, 3, 4])(
    'increases difficulty through the first five levels of chapter %i',
    (id) => {
      const indices = chapterFor(id).levels.map(indexFor);
      for (let index = 1; index < BOSS_INDEX; index += 1) {
        expect(indices[index]).toBeGreaterThanOrEqual(indices[index - 1]!);
      }
    },
  );

  it.each([1, 2, 3, 4])('puts the unique difficulty maximum last in chapter %i', (id) => {
    const indices = chapterFor(id).levels.map(indexFor);
    const maximum = Math.max(...indices);
    expect(indices.filter((index) => index === maximum)).toHaveLength(1);
    expect(indices[BOSS_INDEX]).toBe(maximum);
    expect(indices[BOSS_INDEX]).toBeGreaterThanOrEqual(indices[BOSS_INDEX - 1]! * MIN_BOSS_RATIO);
  });

  it.each([1, 2, 3, 4])(
    'keeps the chapter %i boss within a quarter of the fifth level speed',
    (id) => {
      const levels = chapterFor(id).levels;
      expect(levels[BOSS_INDEX]!.chainSpeed).toBeLessThanOrEqual(
        levels[BOSS_INDEX - 1]!.chainSpeed * MAX_BOSS_SPEED_RATIO,
      );
    },
  );

  it.each(CHAPTERS.slice(1).map(({ id }) => id))(
    'opens chapter %i below the previous boss and at least at its fifth level',
    (id) => {
      const first = indexFor(chapterFor(id).levels[0]!);
      const previous = chapterFor(id - 1).levels;
      expect(first).toBeLessThan(indexFor(previous[BOSS_INDEX]!));
      expect(first).toBeGreaterThanOrEqual(indexFor(previous[BOSS_INDEX - 1]!));
    },
  );

  it('starts chapter two below the previous boss and at least at the previous fifth level', () => {
    const first = indexFor(chapterFor(2).levels[0]!);
    expect(first).toBeLessThan(indexFor(chapterFor(1).levels[BOSS_INDEX]!));
    expect(first).toBeGreaterThanOrEqual(indexFor(chapterFor(1).levels[BOSS_INDEX - 1]!));
  });

  it('starts chapter three below the previous boss and at least at the previous fifth level', () => {
    const first = chapterFor(3).levels[0]!;
    const previous = chapterFor(2).levels;
    expect(indexFor(first)).toBeLessThan(indexFor(previous[BOSS_INDEX]!));
    expect(indexFor(first)).toBeGreaterThanOrEqual(indexFor(previous[BOSS_INDEX - 1]!));
    expect(first.chainLength).toBe(previous[BOSS_INDEX - 1]!.chainLength);
    expect(first.chainSpeed).toBe(previous[BOSS_INDEX - 1]!.chainSpeed);
  });

  it('preserves the original base progression before the first boss', () => {
    chapterFor(1)
      .levels.slice(0, BOSS_INDEX)
      .forEach((level, step) => {
        expect(level.chainLength).toBe(20 + 4 * step);
        expect(level.colorCount).toBe(4 + Math.floor(step / 2));
        expect(level.chainSpeed).toBe(26 + 5 * step);
        expect(level.turns).toBeCloseTo(2.6 + 0.12 * step);
      });
  });

  it('introduces hazards in chapter two, increasing from 0.02 to 0.12', () => {
    expect(chapterFor(1).levels.map(({ hazardChance }) => hazardChance)).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
    const hazards = chapterFor(2).levels.map(({ hazardChance }) => hazardChance);
    expect(hazards[0]).toBeCloseTo(0.02);
    expect(hazards[BOSS_INDEX - 1]).toBeCloseTo(0.1);
    expect(hazards[BOSS_INDEX]).toBeCloseTo(0.12);
    for (let index = 1; index < hazards.length; index += 1) {
      expect(hazards[index]).toBeGreaterThan(hazards[index - 1]!);
    }
  });

  it.each([1, 2])('keeps armor disabled before chapter three in chapter %i', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level.armorChance).toBe(0);
    }
  });

  it.each([1, 2, 3])('keeps reversal disabled before chapter four in chapter %i', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level.reversal).toBeNull();
    }
  });

  it.each([1, 2, 3, 4])('keeps waves disabled before chapter five in chapter %i', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level.waves).toBe(1);
    }
  });

  it('reverses every chapter four level, more often and harder towards the boss', () => {
    const schedules = chapterFor(4).levels.map(({ reversal }) => reversal!);
    expect(schedules.every((schedule) => schedule !== null)).toBe(true);
    for (let index = 1; index < schedules.length; index += 1) {
      expect(schedules[index]!.period).toBeLessThan(schedules[index - 1]!.period);
      expect(schedules[index]!.duration).toBeGreaterThan(schedules[index - 1]!.duration);
      expect(schedules[index]!.factor).toBeLessThan(schedules[index - 1]!.factor);
    }
  });

  it('keeps every reversal short and gentler than full speed backwards', () => {
    for (const { reversal } of chapterFor(4).levels) {
      expect(reversal!.factor).toBeGreaterThanOrEqual(MIN_REVERSAL_FACTOR);
      expect(reversal!.factor).toBeLessThan(0);
      expect(reversal!.duration).toBeLessThanOrEqual(MAX_REVERSAL_SECONDS);
      expect(reversal!.duration).toBeLessThan(reversal!.period);
    }
  });

  it('increases armor from 0.08 to 0.25 with a 0.3 boss in chapter three', () => {
    const armor = chapterFor(3).levels.map(({ armorChance }) => armorChance);
    expect(armor[0]).toBeCloseTo(0.08);
    expect(armor[BOSS_INDEX - 1]).toBeCloseTo(0.25);
    expect(armor[BOSS_INDEX]).toBeCloseTo(0.3);
    for (let index = 1; index < armor.length; index += 1) {
      expect(armor[index]).toBeGreaterThan(armor[index - 1]!);
    }
  });

  it('keeps seven colors and reduced hazard density throughout chapter three', () => {
    for (const level of chapterFor(3).levels) {
      expect(level.colorCount).toBe(7);
      expect(level.hazardChance).toBeGreaterThanOrEqual(0.04);
      expect(level.hazardChance).toBeLessThanOrEqual(0.06);
    }
  });

  it.each([1, 2, 3, 4])('keeps chapter %i within the existing tuning caps', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level.chainLength).toBeLessThanOrEqual(MAX_CHAIN_LENGTH);
      expect(level.chainSpeed).toBeLessThanOrEqual(MAX_CHAIN_SPEED);
      expect(level.colorCount).toBeLessThanOrEqual(MAX_COLOR_COUNT);
      expect(level.turns).toBeLessThanOrEqual(MAX_TURNS);
      expect(level.hazardChance).toBeLessThanOrEqual(MAX_HAZARD_CHANCE);
    }
  });
});
