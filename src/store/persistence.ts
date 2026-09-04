/**
 * localStorage access that cannot break the app. Browsers throw on both read
 * and write when storage is disabled or full: Safari in private mode and
 * "block all cookies" both do it, and the stores read at import time, so an
 * unguarded call takes down the whole game before it renders.
 *
 * A failed read behaves as "nothing stored", a failed write is dropped: the
 * setting still applies to the session, it just does not survive a reload.
 */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage refused the write; the in-memory state is still updated.
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage refused the removal; the in-memory state is still reset.
  }
}
