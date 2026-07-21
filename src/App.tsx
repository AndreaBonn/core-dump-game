import { GameScreen } from '@/components/game/GameScreen';
import { MainMenu } from '@/components/menu/MainMenu';
import { Leaderboard } from '@/components/menu/Leaderboard';
import { Settings } from '@/components/menu/Settings';
import { useGameStore } from '@/store/useGameStore';

function App() {
  const screen = useGameStore((state) => state.screen);

  return (
    <div className="h-full w-full bg-terminal-bg text-terminal-text">
      {screen === 'menu' && <MainMenu />}
      {screen === 'game' && <GameScreen />}
      {screen === 'leaderboard' && <Leaderboard />}
      {screen === 'settings' && <Settings />}
    </div>
  );
}

export default App;
