import { Button } from '@/components/shared/Button';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export function MainMenu() {
  const startGame = useGameStore((state) => state.startGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const tutorialSeen = useSettingsStore((state) => state.tutorialSeen);

  // A first-time player gets taught before being dropped into level 1; the
  // tutorial stays in the menu afterwards for anyone who wants it again.
  const playCampaign = () => startGame(tutorialSeen ? 'campaign' : 'tutorial');

  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-terminal-accent sm:text-6xl">
          Core Dump<span className="animate-pulse text-terminal-trace">_</span>
        </h1>
        <p className="mt-3 font-mono text-sm text-terminal-muted">
          compile the packets before the chain hits /dev/null
        </p>
      </div>

      <nav className="flex w-full max-w-xs flex-col gap-3">
        <Button className="w-full" onClick={playCampaign}>
          Play Campaign
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setScreen('levels')}>
          Select Level
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => startGame('endless')}>
          Endless
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => startGame('daily')}>
          Daily Challenge
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setScreen('leaderboard')}>
          Leaderboard
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setScreen('profile')}>
          Profile
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setScreen('achievements')}>
          Achievements
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => startGame('tutorial')}>
          Tutorial
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setScreen('settings')}>
          Settings
        </Button>
      </nav>
    </main>
  );
}
