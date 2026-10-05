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
  it('defines only the base and hazard chapters in order', () => {
    expect(CHAPTERS.map(({ id, mechanic }) => ({ id, mechanic }))).toEqual([
      { id: 1, mechanic: 'base' },
      { id: 2, mechanic: 'hazard' },
    ]);
  });

  it.each([1, 2])('gives chapter %i six levels', (id) => {
    expect(chapterFor(id).levels).toHaveLength(LEVELS_PER_CHAPTER);
  });

  it.each([1, 2])('increases difficulty through the first five levels of chapter %i', (id) => {
    const indices = chapterFor(id).levels.map(indexFor);
    for (let index = 1; index < BOSS_INDEX; index += 1) {
      expect(indices[index]).toBeGreaterThanOrEqual(indices[index - 1]!);
    }
  });

  it.each([1, 2])('puts the unique difficulty maximum last in chapter %i', (id) => {
    const indices = chapterFor(id).levels.map(indexFor);
    const maximum = Math.max(...indices);
    expect(indices.filter((index) => index === maximum)).toHaveLength(1);
    expect(indices[BOSS_INDEX]).toBe(maximum);
    expect(indices[BOSS_INDEX]).toBeGreaterThanOrEqual(indices[BOSS_INDEX - 1]! * MIN_BOSS_RATIO);
  });

  it.each([1, 2])('keeps the chapter %i boss within a quarter of the fifth level speed', (id) => {
    const levels = chapterFor(id).levels;
    expect(levels[BOSS_INDEX]!.chainSpeed).toBeLessThanOrEqual(
      levels[BOSS_INDEX - 1]!.chainSpeed * MAX_BOSS_SPEED_RATIO,
    );
  });

  it('starts chapter two below the previous boss and at least at the previous fifth level', () => {
    const first = indexFor(chapterFor(2).levels[0]!);
    expect(first).toBeLessThan(indexFor(chapterFor(1).levels[BOSS_INDEX]!));
    expect(first).toBeGreaterThanOrEqual(indexFor(chapterFor(1).levels[BOSS_INDEX - 1]!));
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

  it('introduces hazards only in chapter two, increasing from 0.02 to 0.12', () => {
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

  it.each([1, 2])('keeps later mechanics disabled in chapter %i', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level).toMatchObject({ armorChance: 0, reversal: null, waves: 1 });
    }
  });

  it.each([1, 2])('keeps chapter %i within the existing tuning caps', (id) => {
    for (const level of chapterFor(id).levels) {
      expect(level.chainLength).toBeLessThanOrEqual(MAX_CHAIN_LENGTH);
      expect(level.chainSpeed).toBeLessThanOrEqual(MAX_CHAIN_SPEED);
      expect(level.colorCount).toBeLessThanOrEqual(MAX_COLOR_COUNT);
      expect(level.turns).toBeLessThanOrEqual(MAX_TURNS);
      expect(level.hazardChance).toBeLessThanOrEqual(MAX_HAZARD_CHANCE);
    }
  });
});
