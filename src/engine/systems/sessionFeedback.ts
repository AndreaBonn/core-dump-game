import { comboHitStop } from '@/engine/core/runFeedback';
import { HAZARD_COLOR } from '@/config/packetTypes';
import type { SessionEvent } from '@/engine/LevelSession';
import { audioManager } from '@/engine/audio/AudioManager';
import type { ShotOutcome } from '@/engine/systems/ShotSystem';
import type { VisualFx } from '@/engine/systems/VisualFx';
import type { EngineEvents } from '@/types/game.types';

export const GAME_OVER_SHAKE = 16;

interface SessionFeedback {
  fx: VisualFx;
  events: EngineEvents;
  onShot: (outcome: ShotOutcome) => void;
  onCleared: () => void;
  onBreached: () => void;
}

/** Translate ordered simulation feedback into presentation and run lifecycle actions. */
export function presentSessionEvent(event: SessionEvent, feedback: SessionFeedback): void {
  switch (event.kind) {
    case 'shot':
      feedback.fx.reactToShot(event.outcome, event.at, event.color);
      feedback.onShot(event.outcome);
      return;
    case 'powerUp':
      audioManager.play('powerup');
      feedback.events.onPowerUp(event.type);
      return;
    case 'hazardCleared':
      feedback.fx.spawnExplosion(event.at, HAZARD_COLOR);
      return;
    case 'wave':
      feedback.events.onWaveChange(event.wave, event.total);
      return;
    case 'cleared':
      feedback.onCleared();
      return;
    case 'shieldCaught':
      feedback.fx.addShake(GAME_OVER_SHAKE);
      audioManager.play('powerup');
      return;
    case 'breached':
      feedback.onBreached();
  }
}

interface ShotFeedback {
  hitStopSteps: number;
  reducedMotion: boolean;
  events: EngineEvents;
}

/** Emit match audio and combo feedback, returning the next hit-stop counter. */
export function scoreSessionShot(outcome: ShotOutcome, current: ShotFeedback): number {
  audioManager.playMatch(outcome.combo);
  if (!outcome.combo) return current.hitStopSteps;
  current.events.onComboChange(outcome.combo);
  return comboHitStop(current.hitStopSteps, outcome.combo.multiplier, current.reducedMotion);
}
