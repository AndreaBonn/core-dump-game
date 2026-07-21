import { create } from 'zustand';
import { ensureSignedIn } from '@/services/authService';

interface AuthState {
  uid: string | null;
  ready: boolean;
}

export const useAuthStore = create<AuthState>((set) => {
  void ensureSignedIn().then((uid) => set({ uid, ready: true }));
  return { uid: null, ready: false };
});
