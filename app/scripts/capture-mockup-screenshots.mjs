import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshots() {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        // Capture dashboard screenshot
        console.log('\nCapturing dashboard screenshot...');
        const dashboardPath = join(__dirname, '..', 'mockups', 'colorful', 'dashboard.html');
        await page.goto(`file://${dashboardPath}`);
        await page.waitForTimeout(1000); // Wait for animations and rendering

        const dashboardOutputPath = join(__dirname, '..', 'mockups', 'colorful', 'dashboard.jpg');
        await page.screenshot({
            path: dashboardOutputPath,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        console.log('✓ Dashboard screenshot saved to:', dashboardOutputPath);

        // Capture vehicle detail screenshot
        console.log('\nCapturing vehicle detail screenshot...');
        const vehicleDetailPath = join(__dirname, '..', 'mockups', 'colorful', 'vehicle-detail.html');
        await page.goto(`file://${vehicleDetailPath}`);
        await page.waitForTimeout(1000); // Wait for animations and rendering

        const vehicleDetailOutputPath = join(__dirname, '..', 'mockups', 'colorful', 'vehicle-detail.jpg');
        await page.screenshot({
            path: vehicleDetailOutputPath,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        console.log('✓ Vehicle detail screenshot saved to:', vehicleDetailOutputPath);

        console.log('\n✓ All screenshots captured successfully!');

    } catch (error) {
        console.error('Error capturing screenshots:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

captureScreenshots();
