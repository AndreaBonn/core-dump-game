import { expect, test, type Page } from '@playwright/test';

/**
 * The one path that has to work on every build: open the game, play a shot,
 * score, pause, come back. Assertions read the DOM only, never canvas pixels,
 * and every wait is on a condition, never on a duration: the simulation runs
 * at 120 Hz and a timing guess would fail under CI load instead of failing on
 * a real defect.
 */

async function startCampaign(page: Page): Promise<void> {
  await page.goto('/');
  // Skip the first-run tutorial: these specs are about the game itself.
  await page.evaluate(() => localStorage.setItem('coredump.tutorialSeen', 'true'));
  await page.reload();
  await page.getByRole('button', { name: 'Play Campaign' }).click();
  await expect(page.getByTestId('hud-level')).toHaveText('1/10');
}

/** Fire at a spread of aim points until the chain gives up some points. */
async function scoreAtLeastOnce(page: Page): Promise<void> {
  const board = page.locator('canvas');
  const box = await board.boundingBox();
  expect(box, 'the game canvas must be laid out').not.toBeNull();
  const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  const reach = Math.min(box!.width, box!.height) / 2;

  await expect
    .poll(
      async () => {
        // Sweep the aim around the spiral: some shots miss, a match needs three
        // of a kind to line up, so this keeps firing rather than assuming one
        // lucky shot.
        for (let step = 0; step < 8; step += 1) {
          const angle = (step / 8) * Math.PI * 2;
          await page.mouse.click(
            centre.x + Math.cos(angle) * reach * 0.7,
            centre.y + Math.sin(angle) * reach * 0.7,
          );
        }
        return Number(await page.getByTestId('hud-score').textContent());
      },
      { timeout: 30_000, message: 'firing into the chain should eventually score' },
    )
    .toBeGreaterThan(0);
}

test('a campaign run starts, scores, pauses and resumes', async ({ page }, testInfo) => {
  await startCampaign(page);
  await expect(page.getByTestId('hud-score')).toHaveText('0');

  await scoreAtLeastOnce(page);

  await page.getByRole('button', { name: 'Pause' }).click();
  const paused = page.getByRole('dialog', { name: 'PAUSED' });
  await expect(paused).toBeVisible();

  await testInfo.attach(`board-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await paused.getByRole('button', { name: 'Resume' }).click();
  await expect(paused).toBeHidden();
});

test('the pause overlay can be dismissed with the keyboard', async ({ page }) => {
  await startCampaign(page);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'PAUSED' })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog', { name: 'PAUSED' })).toBeHidden();
});

test('each mode reaches a playable board from the menu', async ({ page }) => {
  for (const mode of ['Play Campaign', 'Endless', 'Daily Challenge']) {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('coredump.tutorialSeen', 'true'));
    await page.reload();
    await page.getByRole('button', { name: mode }).click();

    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('hud-score')).toHaveText('0');
  }
});

test('a first-time player is taught before being dropped into level 1', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Campaign' }).click();

  const tutorial = page.getByRole('region', { name: 'Tutorial' });
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toContainText(/aim and fire/i);

  await tutorial.getByRole('button', { name: /got it/i }).click();
  await expect(tutorial).toContainText(/match three/i);

  await tutorial.getByRole('button', { name: /skip tutorial/i }).click();
  await expect(page.getByRole('button', { name: 'Play Campaign' })).toBeVisible();

  // Having seen it once, the same button now starts the campaign itself.
  await page.getByRole('button', { name: 'Play Campaign' }).click();
  await expect(page.getByTestId('hud-level')).toHaveText('1/10');
  await expect(page.getByRole('region', { name: 'Tutorial' })).toBeHidden();
});

test('the leaderboard opens on every mode without a Firebase project', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Leaderboard' }).click();

  for (const mode of ['Campaign', 'Endless', 'Daily']) {
    await page.getByRole('button', { name: mode }).click();
    await expect(page.getByRole('button', { name: mode })).toHaveAttribute('aria-pressed', 'true');
  }
  // Without VITE_FIREBASE_* the board is unavailable, and that must read as a
  // stated limitation rather than an error or an empty screen.
  await expect(page.getByText(/not configured in this build/i)).toBeVisible();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Play Campaign' })).toBeVisible();
});
