import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const SAVE_MESSAGE_KEY = {
  saving: 'game.saving',
  saved: 'game.saved',
  notABest: 'game.notABest',
  error: 'game.saveError',
  unavailable: 'game.saveUnavailable',
  notScored: 'game.notScored',
} as const satisfies Record<Exclude<SaveStatus, 'idle'>, string>;

export function GameOverScreen({
  result,
  defaultNickname,
  saveStatus,
  onSave,
  onRetry,
  onMenu,
}: GameOverScreenProps) {
  const [nickname, setNickname] = useState(defaultNickname);
  const { t } = useTranslation();
  const title = result.won ? t('game.won') : t('game.lost');
  const canSave = saveStatus === 'idle' || saveStatus === 'error';
  // Nothing to save when there is no board to save to, or when the run was not
  // a scored one: showing a dead nickname field would only be confusing.
  const canOfferSaving = saveStatus !== 'unavailable' && saveStatus !== 'notScored';

  return (
    <Modal title={title}>
      <dl className="mb-5 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <dt className="text-terminal-muted">{t('game.finalScore')}</dt>
          <dd className="text-2xl font-bold tabular-nums text-terminal-accent">
            {result.finalScore}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-terminal-muted">{t('game.levelReached')}</dt>
          <dd className="tabular-nums text-terminal-text">{result.levelReached}</dd>
        </div>
      </dl>

      {canOfferSaving && (
        <div className="mb-4">
          <label htmlFor="nickname" className="mb-1 block text-xs uppercase text-terminal-muted">
            {t('game.nickname')}
          </label>
          <input
            id="nickname"
            value={nickname}
            maxLength={24}
            disabled={!canSave}
            onChange={(event) => setNickname(event.target.value)}
            className="w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 font-mono text-terminal-text focus-visible:border-terminal-trace focus-visible:outline-none disabled:opacity-60"
            placeholder={t('common.nicknamePlaceholder')}
          />
        </div>
      )}

      {saveStatus !== 'idle' && (
        <p
          className={`mb-4 text-center font-mono text-xs ${
            saveStatus === 'error' ? 'text-packet-error' : 'text-terminal-muted'
          }`}
          role="status"
        >
          {t(SAVE_MESSAGE_KEY[saveStatus])}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {canOfferSaving && (
          <Button className="w-full" disabled={!canSave} onClick={() => onSave(nickname)}>
            {t('game.saveScore')}
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onRetry}>
            {t('game.retry')}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onMenu}>
            {t('common.menu')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
