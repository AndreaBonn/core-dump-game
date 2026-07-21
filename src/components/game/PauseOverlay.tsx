import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export function PauseOverlay({ onResume, onRestart, onMenu }: PauseOverlayProps) {
  return (
    <Modal title="PAUSED">
      <div className="flex flex-col gap-2">
        <Button className="w-full" onClick={onResume}>
          Resume
        </Button>
        <Button variant="ghost" className="w-full" onClick={onRestart}>
          Restart level
        </Button>
        <Button variant="ghost" className="w-full" onClick={onMenu}>
          Quit to menu
        </Button>
      </div>
    </Modal>
  );
}
