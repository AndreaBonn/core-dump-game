/**
 * Client side of the launcher's save file (`scripts/lib/saveFile.mjs`). The
 * file is optional: the hosted build has no such route, and then every call
 * here is a quiet no-op and browser storage remains the only save.
 */

export const SAVE_ROUTE = '/api/save';
const LOAD_TIMEOUT_MS = 2000;

let available = false;
let pending: Promise<void> = Promise.resolve();

/**
 * Read the save file. Resolves to its text, or null when there is no file or
 * no launcher behind the page. Writes are enabled only after this succeeds:
 * otherwise a fresh browser would overwrite a richer save with an empty
 * profile before the file had been merged in.
 */
export async function loadSaveFile(): Promise<string | null> {
  try {
    const response = await fetch(SAVE_ROUTE, {
      cache: 'no-store',
      signal: AbortSignal.timeout(LOAD_TIMEOUT_MS),
    });
    // A static host answers the route with index.html; only JSON is a save.
    const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false;
    if (!isJson || (response.status !== 200 && response.status !== 204)) {
      return null;
    }
    available = true;
    return response.status === 200 ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * Write the save file. Writes are chained so they reach the server in the
 * order they were made, and a failed one is logged without blocking the next.
 */
export function writeSaveFile(text: string): void {
  if (!available) {
    return;
  }
  pending = pending
    .then(async () => {
      const response = await fetch(SAVE_ROUTE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      if (!response.ok) {
        console.warn(`Save file write refused with status ${response.status}`);
      }
    })
    .catch((error: unknown) => {
      console.warn('Save file write failed', error);
    });
}

/** True once the launcher's save route has answered; false on a static host. */
export function isSaveFileAvailable(): boolean {
  return available;
}

/** Wait for queued writes; for tests and for code that must not race them. */
export function flushSaveFile(): Promise<void> {
  return pending;
}

/** Back to the state of a fresh page load. Tests only. */
export function resetSaveFileForTests(): void {
  available = false;
  pending = Promise.resolve();
}
