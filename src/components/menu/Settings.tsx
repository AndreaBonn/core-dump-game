import { Button } from '@/components/shared/Button';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export function Settings() {
  const setScreen = useGameStore((state) => state.setScreen);
  const muted = useSettingsStore((state) => state.muted);
  const toggleMuted = useSettingsStore((state) => state.toggleMuted);
  const nickname = useSettingsStore((state) => state.nickname);
  const setNickname = useSettingsStore((state) => state.setNickname);

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-terminal-accent">Settings</h1>

      <div className="flex items-center justify-between rounded border border-terminal-border bg-terminal-panel p-4">
        <div>
          <p className="font-mono text-sm text-terminal-text">Audio</p>
          <p className="font-mono text-xs text-terminal-muted">Sound effects</p>
        </div>
        <Button variant="ghost" onClick={toggleMuted} aria-pressed={muted}>
          {muted ? 'Unmute' : 'Mute'}
        </Button>
      </div>

      <div className="rounded border border-terminal-border bg-terminal-panel p-4">
        <label
          htmlFor="settings-nickname"
          className="mb-2 block font-mono text-sm text-terminal-text"
        >
          Nickname
        </label>
        <input
          id="settings-nickname"
          value={nickname}
          maxLength={24}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="anon"
          className="w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 font-mono text-terminal-text focus-visible:border-terminal-trace focus-visible:outline-none"
        />
      </div>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('privacy')}>
        Privacy and your data
      </Button>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        Back
      </Button>
    </main>
  );
}
