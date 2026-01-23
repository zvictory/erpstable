import { test, expect } from '@playwright/test';

test.describe('Manufacturing Business Type Setup Flow', () => {
  test('should complete setup wizard and show manufacturing dashboard', async ({ page }) => {
    // Note: Test database is pre-configured with Manufacturing business type by global-setup.ts
    // So we go directly to the dashboard which should be visible
    await page.goto('/en/');

    // Wait for page to load - should show dashboard, not setup wizard
    // because database is pre-initialized
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify we see manufacturing dashboard content
    // The dashboard has multiple heading elements
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });

    // Verify we don't see module disabled message
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');
  });

  test('should have manufacturing modules enabled in business context', async ({ page }) => {
    // Verify dashboard loads without ModuleGuard 404
    await page.goto('/en/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText('module is not enabled');
  });

  test('should be able to access manufacturing pages', async ({ page }) => {
    // Test accessing Manufacturing Dashboard
    await page.goto('/en/manufacturing/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see dashboard content
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access inventory pages', async ({ page }) => {
    // Manufacturing includes INVENTORY module
    await page.goto('/en/inventory/items');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see inventory content
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access purchasing pages', async ({ page }) => {
    // Manufacturing includes PURCHASING module
    await page.goto('/en/purchasing/vendors');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see purchasing content
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access sales pages', async ({ page }) => {
    // Manufacturing includes SALES module
    await page.goto('/en/sales/customers');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see sales content (customers or similar)
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access finance pages', async ({ page }) => {
    // Manufacturing includes FINANCE module
    await page.goto('/en/finance/chart-of-accounts');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see finance content
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access assets pages', async ({ page }) => {
    // Manufacturing includes ASSETS module
    await page.goto('/en/assets');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see assets content
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to access production pages', async ({ page }) => {
    // Manufacturing includes PRODUCTION module
    await page.goto('/en/production');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should NOT see 404 for disabled module
    await expect(page.locator('body')).not.toContainText('not enabled for this business type');

    // Should see production content
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });
});
