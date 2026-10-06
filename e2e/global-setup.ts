import { rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { E2E_SAVE_FILE } from './saveFile';

/**
 * Start every run from no save at all: a profile left by the previous run
 * would unlock levels and cosmetics the specs expect to find locked.
 */
export default function globalSetup(): void {
  rmSync(dirname(E2E_SAVE_FILE), { recursive: true, force: true });
}
