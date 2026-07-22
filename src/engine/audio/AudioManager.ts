import { renderSpec } from '@/engine/audio/renderSpec';
import { SOUND_SPECS, type SoundName } from '@/engine/audio/soundSpecs';

export type { SoundName };

type ContextFactory = () => AudioContext;

const MASTER_GAIN = 0.5;

/**
 * Synthesizes short sound effects with the Web Audio API — no audio assets. The
 * context is created lazily on the first `play` (which happens inside a user
 * gesture, satisfying autoplay policies) and resumed if suspended. The context
 * factory is injected so the manager can be tested without a real Web Audio API.
 */
export class AudioManager {
  private readonly createContext: ContextFactory;
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor(createContext: ContextFactory = () => new AudioContext()) {
    this.createContext = createContext;
  }

  /** Kept for API compatibility; synthesis needs no preloading. */
  load(): void {}

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
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }
    renderSpec(ctx, SOUND_SPECS[name], MASTER_GAIN);
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = this.createContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      // Resume can reject if the context was closed mid-flight (e.g. a reload
      // race); the sound is simply dropped rather than surfacing as an error.
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }
}

export const audioManager = new AudioManager();
