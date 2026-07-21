export type SoundName =
  | 'shoot'
  | 'match'
  | 'combo-2'
  | 'combo-3'
  | 'combo-4'
  | 'powerup'
  | 'game-over'
  | 'level-complete';

const SOUND_NAMES: readonly SoundName[] = [
  'shoot',
  'match',
  'combo-2',
  'combo-3',
  'combo-4',
  'powerup',
  'game-over',
  'level-complete',
];

const POOL_SIZE = 4;
const DEFAULT_VOLUME = 0.4;

/**
 * Loads and plays short sound effects from `public/audio/<name>.mp3`. Each
 * sound keeps a small pool of audio elements so rapid repeats do not cut each
 * other off. Missing files fail silently, so the game stays playable before
 * real audio assets are added (spec 9).
 */
export class AudioManager {
  private readonly pools = new Map<SoundName, HTMLAudioElement[]>();
  private readonly cursors = new Map<SoundName, number>();
  private muted = false;
  private loaded = false;

  load(): void {
    if (this.loaded || typeof Audio === 'undefined') {
      return;
    }
    for (const name of SOUND_NAMES) {
      const pool = Array.from({ length: POOL_SIZE }, () => {
        const audio = new Audio(`${import.meta.env.BASE_URL}audio/${name}.mp3`);
        audio.volume = DEFAULT_VOLUME;
        audio.preload = 'auto';
        return audio;
      });
      this.pools.set(name, pool);
      this.cursors.set(name, 0);
    }
    this.loaded = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) {
      return;
    }
    const pool = this.pools.get(name);
    if (!pool) {
      return;
    }
    const cursor = this.cursors.get(name) ?? 0;
    const audio = pool[cursor % pool.length]!;
    this.cursors.set(name, cursor + 1);
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }
}

export const audioManager = new AudioManager();
