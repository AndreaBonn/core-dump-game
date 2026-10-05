import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The suite asserts on English copy; the app defaults to Italian. Seeding the
// stored choice before any test module loads makes i18n and the settings store
// both start in English, the same way a returning English player would.
const LANGUAGE_KEY = 'coredump.language';
// Captured before any test can spy on it: a test that makes storage throw
// must not make this reseed throw with it.
const nativeSetItem = Storage.prototype.setItem;
const seedEnglish = () => nativeSetItem.call(localStorage, LANGUAGE_KEY, 'en');
seedEnglish();
// Components that never import the settings store still need i18n ready.
await import('@/i18n');

afterEach(async () => {
  cleanup();
  localStorage.clear();
  seedEnglish();
  // A test that switched language must not leak it into the next one.
  const { useSettingsStore } = await import('@/store/useSettingsStore');
  useSettingsStore.getState().setLanguage('en');
});
