import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '@/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';

const US_STRIPES = 13;

/** Flags as inline SVG: emoji flags render as bare letters on Windows. */
function Flag({ language }: { language: Language }) {
  if (language === 'it') {
    return (
      <svg viewBox="0 0 3 2" className="h-4 w-6" aria-hidden>
        <rect width="1" height="2" x="0" fill="#009246" />
        <rect width="1" height="2" x="1" fill="#ffffff" />
        <rect width="1" height="2" x="2" fill="#ce2b37" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 19 13" className="h-4 w-6" aria-hidden>
      {Array.from({ length: US_STRIPES }, (_, stripe) => (
        <rect
          key={stripe}
          width="19"
          height="1"
          y={stripe}
          fill={stripe % 2 === 0 ? '#b22234' : '#ffffff'}
        />
      ))}
      <rect width="7.6" height="7" fill="#3c3b6e" />
    </svg>
  );
}

/** Two flag toggles that switch the whole UI language in place. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <div className="flex gap-1" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((option) => {
        const selected = option === language;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            aria-label={t(`language.${option}`)}
            title={t(`language.${option}`)}
            onClick={() => setLanguage(option)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-sm border-2 transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-panel ${
              selected
                ? 'border-terminal-trace opacity-100'
                : 'border-transparent opacity-50 hover:opacity-100'
            }`}
          >
            <Flag language={option} />
          </button>
        );
      })}
    </div>
  );
}
