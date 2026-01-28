import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Starting authentication setup...');

  try {
    // Navigate to login page (use ru as default locale)
    await page.goto('/ru/login');
    console.log('📍 Navigated to login page');

    // Wait for email input to be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    console.log('✓ Email input found');

    // Fill in login credentials (from seed-admin-user.ts)
    await emailInput.fill('admin@erpstable.com');
    console.log('✓ Email filled');

    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('Admin123!');
    console.log('✓ Password filled');

    // Click login button - look for submit button in the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('✓ Login button clicked');

    // Wait for navigation after login - should go to home page
    // The login redirects to '/' which has the locale prepended
    await page.waitForURL(/\/(ru|uz|en)\/?/, { timeout: 15000 });
    console.log('✓ Successfully navigated after login');

    // Verify we're logged in by checking if we can see dashboard
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log('✓ Dashboard visible - authentication successful');

    // Save auth state to file so it can be reused across tests
    await page.context().storageState({ path: 'tests/.auth/user.json' });
    console.log('✅ Auth state saved to tests/.auth/user.json');

  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  }
});
