import { test as base, type BrowserContext } from '@playwright/test';

export { expect } from '@playwright/test';

/** The launcher's save route, as src/services/saveFileService.ts calls it. */
const SAVE_ROUTE = '**/api/save';
const NO_CONTENT = 204;
const OK = 200;

/**
 * Serve the save route from memory, one store per test. Specs run in parallel
 * against a single preview server, and its one save file would let a spec's
 * progress leak into another's: the route never reaches the server now.
 */
async function isolateSaveFile(context: BrowserContext): Promise<void> {
  let saved: string | null = null;
  await context.route(SAVE_ROUTE, async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      saved = request.postData();
      await route.fulfill({ status: NO_CONTENT, contentType: 'application/json' });
      return;
    }
    await route.fulfill(
      saved === null
        ? { status: NO_CONTENT, contentType: 'application/json' }
        : { status: OK, contentType: 'application/json', body: saved },
    );
  });
}

/** Playwright's test, with every context given its own save file. */
export const test = base.extend<{ isolatedSave: void }>({
  isolatedSave: [
    async ({ context }, use) => {
      await isolateSaveFile(context);
      await use();
    },
    { auto: true },
  ],
});
