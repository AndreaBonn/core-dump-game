export type SoundName =
  | 'shoot'
  | 'match'
  | 'combo-2'
  | 'combo-3'
  | 'combo-4'
  | 'powerup'
  | 'game-over'
  | 'level-complete';

/** A single scheduled oscillator note within a synthesized sound effect. */
export interface Tone {
  type: OscillatorType;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional linear ramp target, for pitch sweeps. */
  freqEnd?: number;
  /** Offset from the play moment, in seconds. */
  start: number;
  /** Note length in seconds. */
  duration: number;
  /** Peak gain in [0, 1] before the master gain. */
  gain: number;
}

export type SoundSpec = readonly Tone[];

/**
 * Procedural definitions for every sound effect. Pure data, so the sound design
 * can be unit-tested without a Web Audio context. Rendered by `renderSpec`.
 */
export const SOUND_SPECS: Record<SoundName, SoundSpec> = {
  shoot: [{ type: 'square', freq: 330, freqEnd: 160, start: 0, duration: 0.08, gain: 0.16 }],
  match: [
    { type: 'triangle', freq: 520, start: 0, duration: 0.12, gain: 0.22 },
    { type: 'sine', freq: 780, start: 0.02, duration: 0.1, gain: 0.12 },
  ],
  'combo-2': [
    { type: 'triangle', freq: 600, start: 0, duration: 0.14, gain: 0.24 },
    { type: 'sine', freq: 900, start: 0.04, duration: 0.12, gain: 0.14 },
  ],
  'combo-3': [
    { type: 'triangle', freq: 700, start: 0, duration: 0.15, gain: 0.26 },
    { type: 'sine', freq: 1050, start: 0.04, duration: 0.13, gain: 0.16 },
  ],
  'combo-4': [
    { type: 'triangle', freq: 840, start: 0, duration: 0.16, gain: 0.28 },
    { type: 'square', freq: 420, start: 0, duration: 0.16, gain: 0.12 },
    { type: 'sine', freq: 1260, start: 0.05, duration: 0.14, gain: 0.18 },
  ],
  powerup: [{ type: 'sine', freq: 300, freqEnd: 900, start: 0, duration: 0.18, gain: 0.2 }],
  'game-over': [{ type: 'sawtooth', freq: 300, freqEnd: 70, start: 0, duration: 0.5, gain: 0.25 }],
  'level-complete': [
    { type: 'triangle', freq: 523, start: 0, duration: 0.12, gain: 0.2 },
    { type: 'triangle', freq: 659, start: 0.1, duration: 0.12, gain: 0.2 },
    { type: 'triangle', freq: 784, start: 0.2, duration: 0.18, gain: 0.22 },
  ],
};

export const SOUND_NAMES = Object.keys(SOUND_SPECS) as SoundName[];
