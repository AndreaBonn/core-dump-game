import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { nextChapterAfterBoss } from '@/config/levels';
import type { RunMode } from '@/engine/core/runController';
import type { LevelResult } from '@/store/useGameStore';

interface LevelCompleteScreenProps {
  result: LevelResult;
  totalScore: number;
  /** The level just cleared, 1-based. */
  level: number;
  mode: RunMode;
  onContinue: () => void;
}

export function LevelCompleteScreen({
  result,
  totalScore,
  level,
  mode,
  onContinue,
}: LevelCompleteScreenProps) {
  const { t } = useTranslation();
  // Chapters exist only in the campaign; endless reuses the level numbers.
  const nextChapter = mode === 'campaign' ? nextChapterAfterBoss(level) : null;
  return (
    <Modal title={t('game.levelCleared')}>
      <dl className="mb-6 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <dt className="text-terminal-muted">{t('game.levelScore')}</dt>
          <dd className="tabular-nums text-terminal-text">{result.levelScore}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-terminal-muted">{t('game.clearBonus')}</dt>
          <dd className="tabular-nums text-packet-success">+{result.bonus}</dd>
        </div>
        <div className="flex justify-between border-t border-terminal-border pt-2">
          <dt className="text-terminal-muted">{t('game.total')}</dt>
          <dd className="tabular-nums text-terminal-accent">{totalScore}</dd>
        </div>
      </dl>
      {nextChapter && (
        <p className="mb-6 font-mono text-sm text-terminal-accent">
          {t('game.nextChapter', {
            chapter: nextChapter.id,
            mechanic: t(`levelSelect.mechanics.${nextChapter.mechanic}`),
          })}
        </p>
      )}
      <Button className="w-full" onClick={onContinue}>
        {t('game.continue')}
      </Button>
    </Modal>
  );
}
