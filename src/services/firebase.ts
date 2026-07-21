import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '@/services/firebaseConfig';

export { isFirebaseConfigured };

interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

let servicesPromise: Promise<FirebaseServices | null> | null = null;

/**
 * Lazily load and initialise the Firebase SDK. The SDK is code-split into its
 * own chunk and only fetched when online features are actually used. Resolves
 * to null when the project is not configured.
 */
export function getFirebase(): Promise<FirebaseServices | null> {
  if (!isFirebaseConfigured()) {
    return Promise.resolve(null);
  }
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(firebaseConfig);
      return { auth: getAuth(app), db: getFirestore(app) };
    })();
  }
  return servicesPromise;
}
