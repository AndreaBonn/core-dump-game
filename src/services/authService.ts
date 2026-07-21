import { getFirebase } from '@/services/firebase';

let signInPromise: Promise<string | null> | null = null;

/**
 * Ensure an anonymous Firebase session and return the user id. Returns null
 * when Firebase is not configured or sign-in fails, so callers degrade to
 * offline behaviour instead of throwing (spec 8.4).
 */
export function ensureSignedIn(): Promise<string | null> {
  if (signInPromise) {
    return signInPromise;
  }
  signInPromise = (async () => {
    const firebase = await getFirebase();
    if (!firebase) {
      return null;
    }
    try {
      const { signInAnonymously } = await import('firebase/auth');
      const credential = await signInAnonymously(firebase.auth);
      return credential.user.uid;
    } catch {
      signInPromise = null;
      return null;
    }
  })();
  return signInPromise;
}
