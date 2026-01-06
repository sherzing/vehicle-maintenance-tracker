import { test } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Mockup Screenshots', () => {
  test('capture dashboard mockup', async ({ page }) => {
    const dashboardPath = join(__dirname, '..', 'mockups', 'colorful', 'dashboard.html');
    await page.goto(`file://${dashboardPath}`);
    await page.waitForTimeout(1000);

    const outputPath = join(__dirname, '..', 'mockups', 'colorful', 'dashboard.jpg');
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });
  });

  test('capture vehicle detail mockup', async ({ page }) => {
    const vehicleDetailPath = join(__dirname, '..', 'mockups', 'colorful', 'vehicle-detail.html');
    await page.goto(`file://${vehicleDetailPath}`);
    await page.waitForTimeout(1000);

    const outputPath = join(__dirname, '..', 'mockups', 'colorful', 'vehicle-detail.jpg');
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });
  });
});
