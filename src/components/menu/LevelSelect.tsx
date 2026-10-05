import { useTranslation } from 'react-i18next';
import { ChapterGroup } from '@/components/menu/ChapterGroup';
import { Button } from '@/components/shared/Button';
import { campaignChapters } from '@/config/levels';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

const CHAPTERS = campaignChapters();

export function LevelSelect() {
  const setScreen = useGameStore((state) => state.setScreen);
  const startGame = useGameStore((state) => state.startGame);
  const progress = useProgressStore((state) => state.progress);
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-6">
      <h1 className="mt-4 text-3xl font-bold text-terminal-accent">{t('levelSelect.title')}</h1>
      <p className="font-mono text-sm text-terminal-muted">{t('levelSelect.hint')}</p>

      {CHAPTERS.map((chapter) => (
        <ChapterGroup
          key={chapter.chapterId}
          chapter={chapter}
          progress={progress}
          onStart={(level) => startGame('campaign', level)}
        />
      ))}

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        {t('common.back')}
      </Button>
    </main>
  );
}
