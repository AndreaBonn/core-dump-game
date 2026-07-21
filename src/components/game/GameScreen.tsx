import { useMemo, useRef, useState } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { LevelCompleteScreen } from '@/components/game/LevelCompleteScreen';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import type { GameEngine } from '@/engine/GameEngine';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { EngineEvents } from '@/types/game.types';
import type { SaveStatus } from '@/types/leaderboard.types';

export function GameScreen() {
  const engineRef = useRef<GameEngine | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const levelResult = useGameStore((state) => state.levelResult);
  const gameResult = useGameStore((state) => state.gameResult);
  const nickname = useSettingsStore((state) => state.nickname);

  const events = useMemo<EngineEvents>(() => {
    const store = useGameStore.getState();
    return {
      onScoreChange: store.setScore,
      onLevelChange: store.setLevel,
      onComboChange: store.setCombo,
      onNextPacketChange: store.setNextPacket,
      onLevelComplete: store.reportLevelComplete,
      onGameOver: store.reportGameOver,
      onGameWon: store.reportGameWon,
      onPowerUp: () => {},
    };
  }, []);

  const pause = () => {
    engineRef.current?.pause();
    useGameStore.getState().setStatus('paused');
  };

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
    setSaveStatus('idle');
    useGameStore.getState().startGame();
    engineRef.current?.startRun();
  };

  const goToMenu = () => useGameStore.getState().setScreen('menu');

  const handleSave = () => {
    setSaveStatus('unavailable');
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
