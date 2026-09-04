import { buildTrack, type PathKind } from '@/config/paths';
import type { StarThresholds } from '@/engine/core/stars';
import type { Vec2 } from '@/engine/math/vec2';

export interface LevelConfig {
  readonly level: number;
  readonly waypoints: readonly Vec2[];
  /** Total number of packets in the chain for this level. */
  readonly chainLength: number;
  /** How many distinct packet colours are in play. */
  readonly colorCount: number;
  /** Chain advance speed in pixels per second. */
  readonly chainSpeed: number;
  /** Probability that a generated packet is a power-up. */
  readonly powerUpChance: number;
  /** Probability that a generated packet is an unmatchable hazard. */
  readonly hazardChance: number;
  /** Shape of the track this level is played on. */
  readonly pathKind: PathKind;
  /** Deterministic seed for chain generation. */
  readonly seed: number;
  /** Level scores that earn one, two and three stars. */
  readonly starThresholds: StarThresholds;
}

export const TOTAL_LEVELS = 10;

const POWER_UP_CHANCE = 0.05;

/**
 * Hazards start appearing once the player knows the rules, and are capped well
 * below the density that would wall off a segment of the chain: they are an
 * obstacle to play around, not a way to make a level unwinnable.
 */
const HAZARD_FROM_LEVEL = 4;
const HAZARD_STEP = 0.015;
const MAX_HAZARD_CHANCE = 0.12;

function hazardChanceFor(level: number): number {
  if (level < HAZARD_FROM_LEVEL) {
    return 0;
  }
  return Math.min((level - HAZARD_FROM_LEVEL + 1) * HAZARD_STEP, MAX_HAZARD_CHANCE);
}

/**
 * The track shape of a level, derived rather than tabulated so endless and
 * daily runs past the campaign keep varying. Levels 1-3 stay on the spiral
 * while the player learns the game.
 */
function pathKindFor(level: number): PathKind {
  if (level <= 3) {
    return 'spiral';
  }
  const shapes: readonly PathKind[] = ['spiral', 'serpentine', 'spiral', 'loop'];
  return shapes[(level - 4) % shapes.length]!;
}

/**
 * Points per packet asked for one, two and three stars. Clearing a chain in
 * plain three-packet matches is worth 10 points a packet, so one star forgives
 * a good deal of wasted shots, two is close to a clean run, and three needs
 * combos: chained explosions are the only way past 10 a packet.
 */
const STAR_POINTS_PER_PACKET: readonly [number, number, number] = [6, 10, 15];

/** Round to a readable mark; a threshold of 187 tells the player nothing. */
function starThresholdsFor(chainLength: number): StarThresholds {
  const [one, two, three] = STAR_POINTS_PER_PACKET;
  const mark = (perPacket: number): number => Math.round((chainLength * perPacket) / 10) * 10;
  return [mark(one), mark(two), mark(three)];
}

/** Seed base of the campaign; keeps campaign layouts identical across runs. */
export const CAMPAIGN_SEED_BASE = 1000;

/** Prime step folded into the per-level seed so adjacent levels differ. */
const SEED_STEP = 7919;

// Difficulty caps so endless levels past the campaign stay playable rather than
// scaling without bound. Set high enough not to affect the first TOTAL_LEVELS.
const MAX_CHAIN_LENGTH = 160;
const MAX_CHAIN_SPEED = 220;
const MAX_TURNS = 6;

interface LevelTuning {
  chainLength: number;
  colorCount: number;
  chainSpeed: number;
  turns: number;
  startRadius: number;
}

function tuningForLevel(level: number): LevelTuning {
  const step = level - 1;
  return {
    chainLength: Math.min(20 + step * 4, MAX_CHAIN_LENGTH),
    colorCount: Math.min(4 + Math.floor(step / 2), 7),
    chainSpeed: Math.min(26 + step * 5, MAX_CHAIN_SPEED),
    turns: Math.min(2.6 + step * 0.12, MAX_TURNS),
    startRadius: 250 + (step % 2) * 20,
  };
}

/**
 * Build a level config for any 1-based `level`, seeding chain generation from
 * `seedBase`. The campaign uses CAMPAIGN_SEED_BASE (stable layouts); endless and
 * daily runs pass their own base to vary or reproduce the sequence. Works past
 * TOTAL_LEVELS: tuning extrapolates and is capped so it stays playable.
 */
export function buildLevelConfig(level: number, seedBase: number): LevelConfig {
  const tuning = tuningForLevel(level);
  const pathKind = pathKindFor(level);
  const waypoints: readonly Vec2[] = buildTrack({
    kind: pathKind,
    reach: tuning.startRadius,
    sweeps: pathKind === 'spiral' ? tuning.turns : Math.max(2, Math.round(tuning.turns)),
    waypoints: 64,
  });
  return {
    level,
    waypoints,
    chainLength: tuning.chainLength,
    colorCount: tuning.colorCount,
    chainSpeed: tuning.chainSpeed,
    powerUpChance: POWER_UP_CHANCE,
    hazardChance: hazardChanceFor(level),
    pathKind,
    seed: seedBase + level * SEED_STEP,
    starThresholds: starThresholdsFor(tuning.chainLength),
  };
}

export const LEVELS: readonly LevelConfig[] = Array.from({ length: TOTAL_LEVELS }, (_, index) =>
  buildLevelConfig(index + 1, CAMPAIGN_SEED_BASE),
);

/** Level config for a 1-based level number, clamped to the available range. */
export function getLevel(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(level, TOTAL_LEVELS));
  return LEVELS[clamped - 1]!;
}
