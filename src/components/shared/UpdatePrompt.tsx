import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/shared/Button';

/**
 * Tells the player a new version is installed and lets them take it. The
 * service worker used to swap the app underneath them on the next navigation,
 * which mid-run means the board reloads with no explanation; now the update
 * waits for an explicit choice.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="absolute inset-x-3 bottom-3 z-[500] mx-auto flex max-w-sm flex-col gap-3 rounded border border-terminal-trace bg-terminal-panel p-4 font-mono shadow-lg"
    >
      <p className="text-sm text-terminal-text">
        A new version of Core Dump is ready. Updating restarts the game.
      </p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => void updateServiceWorker(true)}>
          Update now
        </Button>
        <Button variant="ghost" className="flex-1" onClick={() => setNeedRefresh(false)}>
          Later
        </Button>
      </div>
    </div>
  );
}
