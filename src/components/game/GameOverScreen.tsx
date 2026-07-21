import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import type { GameResult } from '@/store/useGameStore';
import type { SaveStatus } from '@/types/leaderboard.types';

interface GameOverScreenProps {
  result: GameResult;
  defaultNickname: string;
  saveStatus: SaveStatus;
  onSave: (nickname: string) => void;
  onRetry: () => void;
  onMenu: () => void;
}

const SAVE_MESSAGES: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Score saved to the leaderboard.',
  error: 'Score not saved - check your connection.',
  unavailable: 'Leaderboard is not configured.',
};

export function GameOverScreen({
  result,
  defaultNickname,
  saveStatus,
  onSave,
  onRetry,
  onMenu,
}: GameOverScreenProps) {
  const [nickname, setNickname] = useState(defaultNickname);
  const title = result.won ? 'SYSTEM STABLE' : 'CORE DUMPED';
  const canSave = saveStatus === 'idle' || saveStatus === 'error';

  return (
    <Modal title={title}>
      <dl className="mb-5 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <dt className="text-terminal-muted">final score</dt>
          <dd className="text-2xl font-bold tabular-nums text-terminal-accent">
            {result.finalScore}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-terminal-muted">level reached</dt>
          <dd className="tabular-nums text-terminal-text">{result.levelReached}</dd>
        </div>
      </dl>

      {saveStatus !== 'unavailable' && (
        <div className="mb-4">
          <label htmlFor="nickname" className="mb-1 block text-xs uppercase text-terminal-muted">
            nickname
          </label>
          <input
            id="nickname"
            value={nickname}
            maxLength={24}
            disabled={!canSave}
            onChange={(event) => setNickname(event.target.value)}
            className="w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 font-mono text-terminal-text focus-visible:border-terminal-trace focus-visible:outline-none disabled:opacity-60"
            placeholder="anon"
          />
        </div>
      )}

      {SAVE_MESSAGES[saveStatus] && (
        <p
          className={`mb-4 text-center font-mono text-xs ${
            saveStatus === 'error' ? 'text-packet-error' : 'text-terminal-muted'
          }`}
          role="status"
        >
          {SAVE_MESSAGES[saveStatus]}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {saveStatus !== 'unavailable' && (
          <Button className="w-full" disabled={!canSave} onClick={() => onSave(nickname)}>
            Save score
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onRetry}>
            Retry
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onMenu}>
            Menu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
