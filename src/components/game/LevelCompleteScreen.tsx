import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import type { LevelResult } from '@/store/useGameStore';

interface LevelCompleteScreenProps {
  result: LevelResult;
  totalScore: number;
  onContinue: () => void;
}

export function LevelCompleteScreen({ result, totalScore, onContinue }: LevelCompleteScreenProps) {
  const { t } = useTranslation();
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
      <Button className="w-full" onClick={onContinue}>
        {t('game.continue')}
      </Button>
    </Modal>
  );
}
