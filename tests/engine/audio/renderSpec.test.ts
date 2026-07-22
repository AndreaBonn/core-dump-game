import { describe, expect, it, vi } from 'vitest';
import { renderSpec, type AudioRenderTarget } from '@/engine/audio/renderSpec';
import type { SoundSpec } from '@/engine/audio/soundSpecs';

interface FakeOsc {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

function createMockTarget(currentTime = 0) {
  const oscillators: FakeOsc[] = [];
  const gains: FakeGain[] = [];
  const destination = {} as AudioNode;

  const target: AudioRenderTarget = {
    currentTime,
    destination,
    createOscillator: () => {
      const osc: FakeOsc = {
        type: '',
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc as unknown as OscillatorNode;
    },
    createGain: () => {
      const gain: FakeGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      gains.push(gain);
      return gain as unknown as GainNode;
    },
  };
  return { target, oscillators, gains, destination };
}

describe('renderSpec', () => {
  it('creates one oscillator and gain per tone', () => {
    const spec: SoundSpec = [
      { type: 'sine', freq: 440, start: 0, duration: 0.1, gain: 0.2 },
      { type: 'square', freq: 660, start: 0.05, duration: 0.1, gain: 0.2 },
    ];
    const { target, oscillators, gains } = createMockTarget();

    renderSpec(target, spec, 1);

    expect(oscillators).toHaveLength(2);
    expect(gains).toHaveLength(2);
  });

  it('sets the oscillator type and schedules frequency and start/stop at the tone offset', () => {
    const spec: SoundSpec = [{ type: 'sawtooth', freq: 300, start: 0.2, duration: 0.4, gain: 0.25 }];
    const { target, oscillators } = createMockTarget(10);

    renderSpec(target, spec, 1);

    const osc = oscillators[0]!;
    expect(osc.type).toBe('sawtooth');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(300, 10.2);
    expect(osc.start).toHaveBeenCalledWith(10.2);
    expect(osc.stop).toHaveBeenCalledWith(10.6);
  });

  it('ramps frequency only when the tone sweeps', () => {
    const { target: a, oscillators: swept } = createMockTarget();
    renderSpec(a, [{ type: 'sine', freq: 300, freqEnd: 900, start: 0, duration: 0.2, gain: 0.2 }], 1);
    expect(swept[0]!.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(900, 0.2);

    const { target: b, oscillators: flat } = createMockTarget();
    renderSpec(b, [{ type: 'sine', freq: 300, start: 0, duration: 0.2, gain: 0.2 }], 1);
    expect(flat[0]!.frequency.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it('scales the peak gain by the master gain and wires osc -> gain -> destination', () => {
    const { target, oscillators, gains, destination } = createMockTarget();
    renderSpec(target, [{ type: 'sine', freq: 440, start: 0, duration: 0.1, gain: 0.4 }], 0.5);

    expect(gains[0]!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, expect.any(Number));
    expect(oscillators[0]!.connect).toHaveBeenCalledWith(gains[0]);
    expect(gains[0]!.connect).toHaveBeenCalledWith(destination);
  });
});
