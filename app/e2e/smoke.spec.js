import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads without console errors', async ({ page }) => {
    const consoleErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for navigation or login page
    await page.waitForLoadState('networkidle');

    // Check for console errors
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');

    // Should see login page elements
    await expect(page.getByRole('heading', { name: /vehicle maintenance tracker/i })).toBeVisible();
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('vehicles page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/vehicles');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('teams page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/teams');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
