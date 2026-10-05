import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/Button';
import { LanguageSwitch } from '@/components/shared/LanguageSwitch';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export function Settings() {
  const setScreen = useGameStore((state) => state.setScreen);
  const muted = useSettingsStore((state) => state.muted);
  const toggleMuted = useSettingsStore((state) => state.toggleMuted);
  const nickname = useSettingsStore((state) => state.nickname);
  const setNickname = useSettingsStore((state) => state.setNickname);
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-terminal-accent">{t('settings.title')}</h1>

      <div className="flex items-center justify-between rounded-sm border border-terminal-border bg-terminal-panel p-4">
        <div>
          <p className="font-mono text-sm text-terminal-text">{t('settings.audio')}</p>
          <p className="font-mono text-xs text-terminal-muted">{t('settings.audioHint')}</p>
        </div>
        <Button variant="ghost" onClick={toggleMuted} aria-pressed={muted}>
          {muted ? t('settings.unmute') : t('settings.mute')}
        </Button>
      </div>

      <div className="rounded-sm border border-terminal-border bg-terminal-panel p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="settings-nickname" className="font-mono text-sm text-terminal-text">
            {t('settings.nickname')}
          </label>
          <LanguageSwitch />
        </div>
        <input
          id="settings-nickname"
          value={nickname}
          maxLength={24}
          onChange={(event) => setNickname(event.target.value)}
          placeholder={t('common.nicknamePlaceholder')}
          className="w-full rounded-sm border border-terminal-border bg-terminal-bg px-3 py-2 font-mono text-terminal-text focus-visible:border-terminal-trace focus-visible:outline-hidden"
        />
      </div>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('privacy')}>
        {t('settings.privacy')}
      </Button>

      <Button variant="ghost" className="w-full" onClick={() => setScreen('menu')}>
        {t('common.back')}
      </Button>
    </main>
  );
}
