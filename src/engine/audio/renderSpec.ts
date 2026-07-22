import type { SoundSpec } from '@/engine/audio/soundSpecs';

/** The slice of a Web Audio context that `renderSpec` needs; met by AudioContext. */
export interface AudioRenderTarget {
  readonly currentTime: number;
  readonly destination: AudioNode;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
}

const ATTACK_FRACTION = 0.3;
const MAX_ATTACK = 0.01;
const SILENCE = 0.0001;

/**
 * Schedule every tone of a sound spec on the given audio target: one oscillator
 * per tone through its own gain envelope (quick attack, exponential decay).
 * Side-effecting on the audio graph but deterministic in what it schedules, so
 * it can be tested against a mock target.
 */
export function renderSpec(target: AudioRenderTarget, spec: SoundSpec, masterGain: number): void {
  for (const tone of spec) {
    const osc = target.createOscillator();
    const gain = target.createGain();
    const t0 = target.currentTime + tone.start;
    const end = t0 + tone.duration;

    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(tone.freqEnd, end);
    }

    const peak = tone.gain * masterGain;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + Math.min(MAX_ATTACK, tone.duration * ATTACK_FRACTION));
    gain.gain.exponentialRampToValueAtTime(SILENCE, end);

    osc.connect(gain);
    gain.connect(target.destination);
    osc.start(t0);
    osc.stop(end);
  }
}
