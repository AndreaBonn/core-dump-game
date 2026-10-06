import { expect, test } from './fixtures';

test('a new player gets Italian, and an English choice survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('button', { name: 'Gioca la campagna' })).toBeVisible();

  await page.getByRole('button', { name: 'Impostazioni' }).click();
  await page.getByRole('button', { name: 'English' }).click();

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Play Campaign' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Italiano' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Gioca la campagna' })).toBeVisible();
});

test('the Italian leaderboard fits a 320 px screen without scrolling sideways', async ({
  page,
}) => {
  // 320 CSS px is the WCAG 1.4.10 reflow width, and the Italian mode labels
  // are the longest the switch has to hold.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Classifica' }).click();
  await expect(page.getByRole('button', { name: 'Del giorno' })).toBeVisible();
  // The font swaps in late (font-display: swap) and widens the labels.
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBe(0);
});
