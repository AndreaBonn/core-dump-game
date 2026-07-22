import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/services/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'k', appId: 'a' },
  isFirebaseConfigured: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ __app: true })) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ __auth: true })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({ __db: true })) }));

import { getFirebase } from '@/services/firebase';
import { isFirebaseConfigured } from '@/services/firebaseConfig';
import { initializeApp } from 'firebase/app';

describe('getFirebase', () => {
  beforeEach(() => {
    (initializeApp as Mock).mockClear();
  });

  it('resolves to null and skips SDK initialisation when not configured', async () => {
    (isFirebaseConfigured as Mock).mockReturnValue(false);
    await expect(getFirebase()).resolves.toBeNull();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('initialises auth and firestore once and memoises the result', async () => {
    (isFirebaseConfigured as Mock).mockReturnValue(true);

    const first = await getFirebase();
    const second = await getFirebase();

    expect(first).toEqual({ auth: { __auth: true }, db: { __db: true } });
    expect(second).toBe(first);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
