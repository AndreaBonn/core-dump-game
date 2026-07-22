import { describe, expect, it } from 'vitest';
import { SOUND_NAMES, SOUND_SPECS } from '@/engine/audio/soundSpecs';

const EXPECTED_NAMES = [
  'shoot',
  'match',
  'combo-2',
  'combo-3',
  'combo-4',
  'powerup',
  'game-over',
  'level-complete',
] as const;

function peakFreq(name: keyof typeof SOUND_SPECS): number {
  return Math.max(...SOUND_SPECS[name].flatMap((t) => [t.freq, t.freqEnd ?? t.freq]));
}

describe('SOUND_SPECS', () => {
  it('defines every sound name exactly once', () => {
    expect(new Set(SOUND_NAMES)).toEqual(new Set(EXPECTED_NAMES));
  });

  it('uses positive durations and audible, bounded gains for every tone', () => {
    for (const spec of Object.values(SOUND_SPECS)) {
      for (const tone of spec) {
        expect(tone.duration).toBeGreaterThan(0);
        expect(tone.gain).toBeGreaterThan(0);
        expect(tone.gain).toBeLessThanOrEqual(1);
      }
    }
  });

  it('sweeps game-over downward and powerup upward', () => {
    const gameOver = SOUND_SPECS['game-over'][0]!;
    const powerup = SOUND_SPECS.powerup[0]!;
    expect(gameOver.freqEnd!).toBeLessThan(gameOver.freq);
    expect(powerup.freqEnd!).toBeGreaterThan(powerup.freq);
  });

  it('escalates pitch with combo depth', () => {
    expect(peakFreq('combo-3')).toBeGreaterThan(peakFreq('combo-2'));
    expect(peakFreq('combo-4')).toBeGreaterThan(peakFreq('combo-3'));
  });

  it('plays level-complete as a rising, staggered arpeggio', () => {
    const notes = SOUND_SPECS['level-complete'];
    for (let i = 1; i < notes.length; i += 1) {
      expect(notes[i]!.start).toBeGreaterThan(notes[i - 1]!.start);
      expect(notes[i]!.freq).toBeGreaterThan(notes[i - 1]!.freq);
    }
  });
});
