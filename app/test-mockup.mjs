import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Dashboard
  await page.goto('file:///Users/sven.herzing/dev/scrapyard/maintainer-cc/app/mockups/colorful/dashboard.html');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './mockups/colorful/dashboard.jpg', type: 'jpeg', quality: 90, fullPage: true });
  console.log('✓ Dashboard screenshot saved');

  // Vehicle Detail
  await page.goto('file:///Users/sven.herzing/dev/scrapyard/maintainer-cc/app/mockups/colorful/vehicle-detail.html');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './mockups/colorful/vehicle-detail.jpg', type: 'jpeg', quality: 90, fullPage: true });
  console.log('✓ Vehicle detail screenshot saved');

  await browser.close();
  console.log('✓ Done!');
})();
