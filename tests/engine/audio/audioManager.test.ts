import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '@/engine/audio/AudioManager';

const SOUND_COUNT = 8;
const POOL_SIZE = 4;

interface FakeAudio {
  volume: number;
  preload: string;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
}

let created: FakeAudio[];

function installFakeAudio(): void {
  created = [];
  const FakeAudioCtor = vi.fn(function (this: FakeAudio) {
    this.volume = 1;
    this.preload = '';
    this.currentTime = -1;
    this.play = vi.fn(() => Promise.resolve());
    created.push(this);
  });
  vi.stubGlobal('Audio', FakeAudioCtor);
}

describe('AudioManager', () => {
  beforeEach(() => {
    installFakeAudio();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds one pool per sound and is idempotent across repeated loads', () => {
    const manager = new AudioManager();
    manager.load();
    manager.load();
    expect(created).toHaveLength(SOUND_COUNT * POOL_SIZE);
  });

  it('does not construct audio when the Audio API is unavailable', () => {
    vi.stubGlobal('Audio', undefined);
    const manager = new AudioManager();
    expect(() => manager.load()).not.toThrow();
    // No pool was built, so playing is silently ignored rather than throwing.
    expect(() => manager.play('shoot')).not.toThrow();
  });

  it('rewinds and plays a pooled element, cycling through the pool on repeats', () => {
    const manager = new AudioManager();
    manager.load();
    const shootPool = created.slice(0, POOL_SIZE);

    for (let i = 0; i < POOL_SIZE; i += 1) {
      manager.play('shoot');
    }
    for (const element of shootPool) {
      expect(element.currentTime).toBe(0);
      expect(element.play).toHaveBeenCalledTimes(1);
    }

    // The (POOL_SIZE + 1)-th play wraps back to the first element.
    manager.play('shoot');
    expect(shootPool[0]!.play).toHaveBeenCalledTimes(2);
  });

  it('plays nothing while muted', () => {
    const manager = new AudioManager();
    manager.load();
    manager.setMuted(true);
    manager.play('shoot');
    expect(created.every((audio) => audio.play.mock.calls.length === 0)).toBe(true);
  });

  it('exposes the mute state it was set to', () => {
    const manager = new AudioManager();
    expect(manager.isMuted()).toBe(false);
    manager.setMuted(true);
    expect(manager.isMuted()).toBe(true);
  });

  it('ignores an unknown or not-yet-loaded sound without throwing', () => {
    const manager = new AudioManager();
    expect(() => manager.play('match')).not.toThrow();
    expect(created).toHaveLength(0);
  });
});
