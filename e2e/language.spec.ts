import { expect, test } from '@playwright/test';

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
