import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/Button';
import type { ChapterLevels, LevelConfig } from '@/config/levels';
import {
  chapterStars,
  isLevelUnlocked,
  starsOf,
  type CampaignProgress,
} from '@/engine/core/progress';

/**
 * Three slots, filled or hollow, so the rating reads without colour alone. They
 * take the tile's text colour: the accent green on a cleared, green tile was
 * barely visible.
 */
function Stars({ earned }: { earned: number }) {
  return (
    <span aria-hidden className="text-xs tracking-widest">
      {'*'.repeat(earned)}
      <span className="opacity-40">{'.'.repeat(3 - earned)}</span>
    </span>
  );
}

interface LevelTileProps {
  config: LevelConfig;
  progress: CampaignProgress;
  onStart: (level: number) => void;
}

function tileLabel(t: ReturnType<typeof useTranslation>['t'], props: LevelTileProps): string {
  const { level, isBoss } = props.config;
  if (!isLevelUnlocked(props.progress, level)) {
    const key = isBoss ? 'levelSelect.bossLockedAria' : 'levelSelect.levelLockedAria';
    return t(key, { level, previous: level - 1 });
  }
  const key = isBoss ? 'levelSelect.bossAria' : 'levelSelect.levelAria';
  return t(key, { level, count: starsOf(props.progress, level) });
}

function LevelTile(props: LevelTileProps) {
  const { config, progress, onStart } = props;
  const { t } = useTranslation();
  const unlocked = isLevelUnlocked(progress, config.level);
  const stars = starsOf(progress, config.level);
  return (
    <li>
      <Button
        variant={stars > 0 ? 'primary' : 'ghost'}
        className="flex w-full flex-col gap-1"
        disabled={!unlocked}
        aria-label={tileLabel(t, props)}
        onClick={() => onStart(config.level)}
      >
        {config.isBoss && (
          // The tile's own text colour: red on the cleared, green tile read at 1.15:1.
          <span className="text-xs font-bold tracking-widest">{t('levelSelect.boss')}</span>
        )}
        <span>
          {unlocked
            ? t('levelSelect.level', { level: config.level })
            : t('levelSelect.levelLocked', { level: config.level })}
        </span>
        {unlocked && <Stars earned={stars} />}
      </Button>
    </li>
  );
}

interface ChapterGroupProps {
  chapter: ChapterLevels;
  progress: CampaignProgress;
  onStart: (level: number) => void;
}

/** One chapter of the level select: its heading, its star tally and its levels. */
export function ChapterGroup({ chapter, progress, onStart }: ChapterGroupProps) {
  const { t } = useTranslation();
  const headingId = `chapter-${chapter.chapterId}`;
  const tally = chapterStars(progress, chapter.levels);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 border-b border-terminal-border pb-1">
        <h2 id={headingId} className="font-mono text-sm font-bold text-terminal-text">
          {t('levelSelect.chapterTitle', {
            chapter: chapter.chapterId,
            mechanic: t(`levelSelect.mechanics.${chapter.mechanic}`),
          })}
        </h2>
        <span className="shrink-0 font-mono text-xs text-terminal-muted tabular-nums">
          {t('levelSelect.chapterStars', tally)}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-3">
        {chapter.levels.map((config) => (
          <LevelTile key={config.level} config={config} progress={progress} onStart={onStart} />
        ))}
      </ol>
    </section>
  );
}
