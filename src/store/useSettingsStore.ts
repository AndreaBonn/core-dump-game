import { create } from 'zustand';
import { audioManager } from '@/engine/audio/AudioManager';
import { applyLanguage, DEFAULT_LANGUAGE, LANGUAGE_KEY, readLanguage, type Language } from '@/i18n';
import { readStored, removeStored, writeStored } from '@/store/persistence';

const MUTED_KEY = 'coredump.muted';
const NICKNAME_KEY = 'coredump.nickname';
const TUTORIAL_KEY = 'coredump.tutorialSeen';

function readMuted(): boolean {
  return readStored(MUTED_KEY) === 'true';
}

function readNickname(): string {
  return readStored(NICKNAME_KEY) ?? '';
}

interface SettingsState {
  muted: boolean;
  nickname: string;
  /** False until the player has been through, or skipped, the tutorial. */
  tutorialSeen: boolean;
  language: Language;
  toggleMuted: () => void;
  setNickname: (nickname: string) => void;
  markTutorialSeen: () => void;
  setLanguage: (language: Language) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const muted = readMuted();
  audioManager.setMuted(muted);

  return {
    muted,
    nickname: readNickname(),
    tutorialSeen: readStored(TUTORIAL_KEY) === 'true',
    language: readLanguage(),
    toggleMuted: () => {
      const next = !get().muted;
      audioManager.setMuted(next);
      writeStored(MUTED_KEY, String(next));
      set({ muted: next });
    },
    /** Wipe every preference this store owns, for the privacy screen. */
    resetSettings: () => {
      removeStored(MUTED_KEY);
      removeStored(NICKNAME_KEY);
      removeStored(TUTORIAL_KEY);
      removeStored(LANGUAGE_KEY);
      audioManager.setMuted(false);
      applyLanguage(DEFAULT_LANGUAGE);
      set({ muted: false, nickname: '', tutorialSeen: false, language: DEFAULT_LANGUAGE });
    },
    markTutorialSeen: () => {
      writeStored(TUTORIAL_KEY, 'true');
      set({ tutorialSeen: true });
    },
    setLanguage: (language: Language) => {
      writeStored(LANGUAGE_KEY, language);
      applyLanguage(language);
      set({ language });
    },
    setNickname: (nickname: string) => {
      const trimmed = nickname.trim().slice(0, 24);
      writeStored(NICKNAME_KEY, trimmed);
      set({ nickname: trimmed });
    },
  };
});
