import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from '@/engine/audio/AudioManager';

interface FakeContext {
  state: 'running' | 'suspended';
  currentTime: number;
  destination: AudioNode;
  resume: ReturnType<typeof vi.fn>;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
}

function createFakeContext(state: 'running' | 'suspended' = 'running'): FakeContext {
  const osc = () => ({
    type: '',
    frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  const gain = () => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });
  return {
    state,
    currentTime: 0,
    destination: {} as AudioNode,
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(osc),
    createGain: vi.fn(gain),
  };
}

describe('AudioManager', () => {
  it('creates the audio context lazily on the first play and reuses it after', () => {
    const ctx = createFakeContext();
    const factory = vi.fn(() => ctx as unknown as AudioContext);
    const manager = new AudioManager(factory);

    expect(factory).not.toHaveBeenCalled();
    manager.play('shoot');
    manager.play('match');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('synthesizes a sound by scheduling oscillators on the context', () => {
    const ctx = createFakeContext();
    const manager = new AudioManager(() => ctx as unknown as AudioContext);

    manager.play('match');

    // The "match" spec has two tones, so two oscillators are scheduled.
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('stays silent while muted and does not touch the audio context', () => {
    const factory = vi.fn(() => createFakeContext() as unknown as AudioContext);
    const manager = new AudioManager(factory);
    manager.setMuted(true);

    manager.play('shoot');

    expect(factory).not.toHaveBeenCalled();
    expect(manager.isMuted()).toBe(true);
  });

  it('resumes a suspended context (autoplay unlock) on play', () => {
    const ctx = createFakeContext('suspended');
    const manager = new AudioManager(() => ctx as unknown as AudioContext);

    manager.play('shoot');

    expect(ctx.resume).toHaveBeenCalled();
  });

  it('does not throw when resuming the context rejects', () => {
    const ctx = createFakeContext('suspended');
    ctx.resume.mockReturnValue(Promise.reject(new Error('context closed')));
    const manager = new AudioManager(() => ctx as unknown as AudioContext);

    expect(() => manager.play('shoot')).not.toThrow();
  });

  it('degrades silently when the audio context cannot be created', () => {
    const manager = new AudioManager(() => {
      throw new Error('no Web Audio');
    });

    expect(() => manager.play('shoot')).not.toThrow();
  });

  it('load is a no-op and mute state is reported', () => {
    const manager = new AudioManager(() => createFakeContext() as unknown as AudioContext);
    expect(() => manager.load()).not.toThrow();
    expect(manager.isMuted()).toBe(false);
  });

  describe('playMatch', () => {
    function trackedManager() {
      const manager = new AudioManager(() => createFakeContext() as unknown as AudioContext);
      const played = vi.spyOn(manager, 'play');
      return { manager, played };
    }

    it('plays only the match sound when there is no combo', () => {
      const { manager, played } = trackedManager();

      manager.playMatch(null);

      expect(played.mock.calls.map(([name]) => name)).toEqual(['match']);
    });

    it('adds the combo sound for the combo size', () => {
      const { manager, played } = trackedManager();

      manager.playMatch({ multiplier: 3, text: 'STACK OVERFLOW!' });

      expect(played.mock.calls.map(([name]) => name)).toEqual(['match', 'combo-3']);
    });

    it('reuses the loudest sample for combos past the last one available', () => {
      const { manager, played } = trackedManager();

      manager.playMatch({ multiplier: 9, text: 'KERNEL PANIC!!' });

      expect(played.mock.calls.map(([name]) => name)).toEqual(['match', 'combo-4']);
    });
  });
});
