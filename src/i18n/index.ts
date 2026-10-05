import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from '@/i18n/locales/en';
import { it } from '@/i18n/locales/it';
import { readStored } from '@/store/persistence';

export const LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'it';
export const LANGUAGE_KEY = 'coredump.language';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** The stored choice, or the default when nothing valid was saved. */
export function readLanguage(): Language {
  const stored = readStored(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

/**
 * Switch the UI language. The resources are bundled, so the change is
 * synchronous and every mounted `useTranslation` re-renders in place.
 * `<html lang>` follows so screen readers pick the right pronunciation.
 */
export function applyLanguage(language: Language): void {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, it: { translation: it } },
  lng: readLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // React escapes text already; escaping here too would double-encode.
  interpolation: { escapeValue: false },
  initAsync: false,
});
document.documentElement.lang = i18n.language;

export { i18n };
