import { expect, test } from '@playwright/test';

/**
 * The cosmetic picker end to end: a choice made on the profile must survive a
 * reload and reach the board. Okabe-Ito is picked because it is open from the
 * first run, and every one of its colours differs from the classic palette.
 */

// The Okabe-Ito palette as the HUD paints it, in the rgb() form getComputedStyle returns.
const OKABE_ITO = new Set([
  'rgb(213, 94, 0)',
  'rgb(0, 158, 115)',
  'rgb(86, 180, 233)',
  'rgb(240, 228, 66)',
  'rgb(64, 143, 193)',
  'rgb(230, 159, 0)',
  'rgb(204, 121, 167)',
]);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('coredump.language', 'en');
    localStorage.setItem('coredump.tutorialSeen', 'true');
  });
});

test('a palette picked on the profile survives a reload and paints the board', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile' }).click();
  const palette = page.getByRole('group', { name: 'Palette' });
  await expect(palette.getByRole('radio', { name: /Neon/ })).toBeDisabled();
  await expect(palette.getByText('clear 3 bosses')).toBeVisible();

  await palette.getByRole('radio', { name: /Okabe-Ito/ }).check();
  await page.reload();
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('radio', { name: /Okabe-Ito/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Classic/ })).not.toBeChecked();

  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Play Campaign' }).click();
  const next = page.getByText('NEXT').locator('..').locator('span');
  const colour = await next.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(OKABE_ITO.has(colour), colour).toBe(true);
});
