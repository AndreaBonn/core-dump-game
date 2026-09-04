import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { LevelCompleteScreen } from '@/components/game/LevelCompleteScreen';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import { POWER_UPS } from '@/config/powerUps';
import type { GameEngine } from '@/engine/GameEngine';
import { runConfigForMode } from '@/engine/core/runController';
import { ensureSignedIn } from '@/services/authService';
import { isLeaderboardAvailable, saveScore } from '@/services/leaderboardService';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { EngineEvents } from '@/types/game.types';
import type { SaveStatus } from '@/types/leaderboard.types';

export function GameScreen() {
  const engineRef = useRef<GameEngine | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() =>
    isLeaderboardAvailable() ? 'idle' : 'unavailable',
  );

  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const levelResult = useGameStore((state) => state.levelResult);
  const gameResult = useGameStore((state) => state.gameResult);
  const nickname = useSettingsStore((state) => state.nickname);

  // The engine reports to two places: the run state the HUD reads, and the
  // profile that outlives the run. Everything durable goes through the profile
  // store, which is the only one that writes to disk.
  const events = useMemo<EngineEvents>(() => {
    const store = useGameStore.getState();
    // Actions are stable, but state read off a snapshot would be frozen at
    // mount time: anything that reads a value calls getState() when it fires.
    const profile = () => useProgressStore.getState();
    return {
      onScoreChange: store.setScore,
      onLevelChange: store.setLevel,
      onComboChange: (combo) => {
        store.setCombo(combo);
        if (combo) {
          profile().noteCombo(combo.multiplier);
        }
      },
      onNextPacketChange: store.setNextPacket,
      onLevelComplete: (levelScore, bonus) => {
        store.reportLevelComplete(levelScore, bonus);
        profile().recordLevelResult(useGameStore.getState().level, levelScore);
      },
      onRunEnd: (result) => {
        store.reportRunEnd(result);
        profile().recordRunEnd(result);
      },
      onPowerUp: (type) => {
        store.setPowerUp(POWER_UPS[type].name);
        profile().notePowerUp();
      },
    };
  }, []);

  const pause = () => {
    engineRef.current?.pause();
    useGameStore.getState().setStatus('paused');
  };

  // Pause when the tab is hidden so the chain does not advance unattended.
  // No auto-resume: the player consciously resumes from the pause overlay.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && useGameStore.getState().status === 'playing') {
        engineRef.current?.pause();
        useGameStore.getState().setStatus('paused');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const resume = () => {
    engineRef.current?.resume();
    useGameStore.getState().setStatus('playing');
  };

  const restartLevel = () => {
    engineRef.current?.startLevel(useGameStore.getState().level);
    useGameStore.getState().setStatus('playing');
  };

  const continueToNextLevel = () => {
    engineRef.current?.nextLevel();
    useGameStore.getState().advanceLevel();
  };

  const retry = () => {
    const { mode, startLevel } = useGameStore.getState();
    setSaveStatus(isLeaderboardAvailable() ? 'idle' : 'unavailable');
    useGameStore.getState().startGame(mode, startLevel);
    engineRef.current?.startRun(runConfigForMode(mode, startLevel));
  };

  const goToMenu = () => useGameStore.getState().setScreen('menu');

  const handleSave = async (typedNickname: string) => {
    if (!isLeaderboardAvailable()) {
      setSaveStatus('unavailable');
      return;
    }
    setSaveStatus('saving');
    const uid = await ensureSignedIn();
    if (!uid || !gameResult) {
      setSaveStatus('error');
      return;
    }
    useSettingsStore.getState().setNickname(typedNickname);
    try {
      const outcome = await saveScore(
        {
          displayName: typedNickname,
          score: gameResult.finalScore,
          levelReached: gameResult.levelReached,
        },
        uid,
        useGameStore.getState().mode,
      );
      setSaveStatus(outcome === 'saved' ? 'saved' : 'notABest');
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="relative h-full w-full">
      <GameCanvas events={events} onReady={(engine) => (engineRef.current = engine)} />
      <HUD onPause={pause} />

      {status === 'paused' && (
        <PauseOverlay onResume={resume} onRestart={restartLevel} onMenu={goToMenu} />
      )}
      {status === 'levelComplete' && levelResult && (
        <LevelCompleteScreen
          result={levelResult}
          totalScore={score}
          onContinue={continueToNextLevel}
        />
      )}
      {(status === 'gameOver' || status === 'gameWon') && gameResult && (
        <GameOverScreen
          result={gameResult}
          defaultNickname={nickname}
          saveStatus={saveStatus}
          onSave={handleSave}
          onRetry={retry}
          onMenu={goToMenu}
        />
      )}
    </div>
  );
}
