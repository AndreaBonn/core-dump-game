import { fileURLToPath } from 'node:url';

/**
 * Where the preview server under test keeps its save file: a folder of its
 * own, so the suite never reads or writes the player's save/progress.json.
 */
export const E2E_SAVE_FILE = fileURLToPath(new URL('../.e2e-save/progress.json', import.meta.url));
