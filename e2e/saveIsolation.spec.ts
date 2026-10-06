import { expect, test } from './fixtures';

/**
 * Specs run in parallel against one preview server. Each must start from no
 * save and keep what it writes to itself, or one spec's progress unlocks
 * levels and cosmetics another expects to find locked.
 */
test.describe.configure({ mode: 'serial' });

// Same origin as the game, without loading it: the app writes its own profile
// on start, and only the writes these tests make should be in the save.
const BLANK_PAGE = '/robots.txt';

test('a save written by one test stays with that test', async ({ page }) => {
  await page.goto(BLANK_PAGE);
  const saved = await page.evaluate(async () => {
    await fetch('/api/save', { method: 'PUT', body: '{"marker":1}' });
    return (await fetch('/api/save')).text();
  });

  expect(saved).toBe('{"marker":1}');
});

test('the next test starts from no save at all', async ({ page }) => {
  await page.goto(BLANK_PAGE);
  const status = await page.evaluate(async () => (await fetch('/api/save')).status);

  expect(status).toBe(204);
});
