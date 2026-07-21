import { create } from 'zustand';
import { audioManager } from '@/engine/audio/AudioManager';

const MUTED_KEY = 'coredump.muted';
const NICKNAME_KEY = 'coredump.nickname';

function readMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === 'true';
}

function readNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? '';
}

interface SettingsState {
  muted: boolean;
  nickname: string;
  toggleMuted: () => void;
  setNickname: (nickname: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const muted = readMuted();
  audioManager.setMuted(muted);

  return {
    muted,
    nickname: readNickname(),
    toggleMuted: () => {
      const next = !get().muted;
      audioManager.setMuted(next);
      localStorage.setItem(MUTED_KEY, String(next));
      set({ muted: next });
    },
    setNickname: (nickname: string) => {
      const trimmed = nickname.trim().slice(0, 24);
      localStorage.setItem(NICKNAME_KEY, trimmed);
      set({ nickname: trimmed });
    },
  };
});
