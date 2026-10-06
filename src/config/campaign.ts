import type { ReversalSchedule } from '@/config/levels';

export type ChapterMechanic = 'base' | 'hazard' | 'armor' | 'reversal' | 'waves';

export interface LevelSpec {
  readonly chainLength: number;
  readonly colorCount: number;
  readonly chainSpeed: number;
  readonly turns: number;
  readonly hazardChance: number;
  readonly armorChance: number;
  readonly reversal: ReversalSchedule | null;
  readonly waves: number;
}

export interface ChapterSpec {
  readonly id: number;
  readonly mechanic: ChapterMechanic;
  readonly levels: readonly LevelSpec[];
}

const BASE_MECHANICS = { hazardChance: 0, armorChance: 0, reversal: null, waves: 1 } as const;

/**
 * Hazards and armor stay in the reversal chapter at a lower density than
 * where they peaked: the new mechanic is the lesson, the old ones the noise.
 */
const LATE_MECHANICS = { ...BASE_MECHANICS, hazardChance: 0.06, armorChance: 0.2 } as const;

export const CHAPTERS: readonly ChapterSpec[] = [
  {
    id: 1,
    mechanic: 'base',
    levels: [
      { ...BASE_MECHANICS, chainLength: 20, colorCount: 4, chainSpeed: 26, turns: 2.6 },
      { ...BASE_MECHANICS, chainLength: 24, colorCount: 4, chainSpeed: 31, turns: 2.72 },
      { ...BASE_MECHANICS, chainLength: 28, colorCount: 5, chainSpeed: 36, turns: 2.84 },
      { ...BASE_MECHANICS, chainLength: 32, colorCount: 5, chainSpeed: 41, turns: 2.96 },
      { ...BASE_MECHANICS, chainLength: 36, colorCount: 6, chainSpeed: 46, turns: 3.08 },
      { ...BASE_MECHANICS, chainLength: 48, colorCount: 6, chainSpeed: 57, turns: 3.2 },
    ],
  },
  {
    id: 2,
    mechanic: 'hazard',
    levels: [
      {
        ...BASE_MECHANICS,
        chainLength: 36,
        colorCount: 6,
        chainSpeed: 46,
        turns: 3.08,
        hazardChance: 0.02,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 40,
        colorCount: 6,
        chainSpeed: 51,
        turns: 3.2,
        hazardChance: 0.04,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 44,
        colorCount: 7,
        chainSpeed: 56,
        turns: 3.32,
        hazardChance: 0.06,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 48,
        colorCount: 7,
        chainSpeed: 61,
        turns: 3.44,
        hazardChance: 0.08,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 52,
        colorCount: 7,
        chainSpeed: 66,
        turns: 3.56,
        hazardChance: 0.1,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 64,
        colorCount: 7,
        chainSpeed: 78,
        turns: 3.8,
        hazardChance: 0.12,
      },
    ],
  },
  {
    id: 3,
    mechanic: 'armor',
    levels: [
      {
        ...BASE_MECHANICS,
        chainLength: 52,
        colorCount: 7,
        chainSpeed: 66,
        turns: 3.56,
        hazardChance: 0.06,
        armorChance: 0.08,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 56,
        colorCount: 7,
        chainSpeed: 71,
        turns: 3.68,
        hazardChance: 0.06,
        armorChance: 0.12,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 60,
        colorCount: 7,
        chainSpeed: 76,
        turns: 3.8,
        hazardChance: 0.06,
        armorChance: 0.16,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 64,
        colorCount: 7,
        chainSpeed: 81,
        turns: 3.92,
        hazardChance: 0.06,
        armorChance: 0.2,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 68,
        colorCount: 7,
        chainSpeed: 86,
        turns: 4.04,
        hazardChance: 0.06,
        armorChance: 0.25,
      },
      {
        ...BASE_MECHANICS,
        chainLength: 84,
        colorCount: 7,
        chainSpeed: 102,
        turns: 4.28,
        hazardChance: 0.06,
        armorChance: 0.3,
      },
    ],
  },
  {
    id: 4,
    mechanic: 'reversal',
    levels: [
      {
        ...LATE_MECHANICS,
        chainLength: 68,
        colorCount: 7,
        chainSpeed: 86,
        turns: 4.04,
        reversal: { period: 12, duration: 1.0, factor: -0.3 },
      },
      {
        ...LATE_MECHANICS,
        chainLength: 72,
        colorCount: 7,
        chainSpeed: 91,
        turns: 4.16,
        reversal: { period: 11, duration: 1.2, factor: -0.35 },
      },
      {
        ...LATE_MECHANICS,
        chainLength: 76,
        colorCount: 7,
        chainSpeed: 96,
        turns: 4.28,
        reversal: { period: 10, duration: 1.4, factor: -0.4 },
      },
      {
        ...LATE_MECHANICS,
        chainLength: 80,
        colorCount: 7,
        chainSpeed: 101,
        turns: 4.4,
        reversal: { period: 9, duration: 1.6, factor: -0.45 },
      },
      {
        ...LATE_MECHANICS,
        chainLength: 84,
        colorCount: 7,
        chainSpeed: 106,
        turns: 4.52,
        reversal: { period: 8, duration: 1.8, factor: -0.5 },
      },
      {
        ...LATE_MECHANICS,
        chainLength: 100,
        colorCount: 7,
        chainSpeed: 126,
        turns: 4.76,
        reversal: { period: 7, duration: 2, factor: -0.6 },
      },
    ],
  },
];
