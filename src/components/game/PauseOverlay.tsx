import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export function PauseOverlay({ onResume, onRestart, onMenu }: PauseOverlayProps) {
  const { t } = useTranslation();
  return (
    <Modal title={t('game.paused')} onClose={onResume}>
      <div className="flex flex-col gap-2">
        <Button className="w-full" onClick={onResume}>
          {t('game.resume')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onRestart}>
          {t('game.restartLevel')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onMenu}>
          {t('game.quitToMenu')}
        </Button>
      </div>
    </Modal>
  );
}
