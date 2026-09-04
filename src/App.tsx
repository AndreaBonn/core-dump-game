import { GameScreen } from '@/components/game/GameScreen';
import { AchievementToast } from '@/components/shared/AchievementToast';
import { UpdatePrompt } from '@/components/shared/UpdatePrompt';
import { Achievements } from '@/components/menu/Achievements';
import { LevelSelect } from '@/components/menu/LevelSelect';
import { MainMenu } from '@/components/menu/MainMenu';
import { Leaderboard } from '@/components/menu/Leaderboard';
import { Profile } from '@/components/menu/Profile';
import { Settings } from '@/components/menu/Settings';
import { useGameStore } from '@/store/useGameStore';

function App() {
  const screen = useGameStore((state) => state.screen);

  return (
    <div className="h-full w-full bg-terminal-bg text-terminal-text">
      {screen === 'menu' && <MainMenu />}
      {screen === 'game' && <GameScreen />}
      {screen === 'levels' && <LevelSelect />}
      {screen === 'profile' && <Profile />}
      {screen === 'achievements' && <Achievements />}
      {screen === 'leaderboard' && <Leaderboard />}
      {screen === 'settings' && <Settings />}
      <AchievementToast />
      <UpdatePrompt />
    </div>
  );
}

export default App;
