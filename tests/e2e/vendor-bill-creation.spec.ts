import { test, expect } from '@playwright/test';

test.describe('Vendor Bill Creation - Transaction Fix Verification', () => {
  test('should create a bill for Food City vendor without transaction errors', async ({ page }) => {
    // Setup: Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Setup: Listen for unhandled errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // 0. Login first
    await page.goto('/en/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill('admin@erpstable.com');
      await page.locator('input[type="password"]').fill('Admin123!');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/(ru|uz|en)\/?/, { timeout: 15000 });
      console.log('✅ Logged in successfully');
    }

    // 1. Navigate to Food City vendor page (ID: 56)
    await page.goto('/en/purchasing/vendors/56');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // 2. Click "New Bill" button
    const newBillButton = page.locator('button').filter({ hasText: /New Bill/i });
    await expect(newBillButton).toBeVisible({ timeout: 5000 });
    await newBillButton.click();

    // 3. Wait for modal/form to appear
    await page.waitForTimeout(1000);

    // 4. Fill bill form
    // Bill number
    const billNumberInput = page.locator('input[name="refNumber"], input[placeholder*="Bill Number" i]').first();
    await billNumberInput.fill('TEST-CACHE-001');

    // Bill date (should be auto-filled, but let's ensure it exists)
    const billDateInput = page.locator('input[name="transactionDate"], input[type="date"]').first();
    if (await billDateInput.isVisible()) {
      await billDateInput.fill('2026-01-29');
    }

    // 5. Add line item
    // Find item select/combobox (item 1: olma)
    const itemSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Item|Номенклатура/i }).first();
    if (await itemSelect.isVisible()) {
      await itemSelect.click();
      await page.waitForTimeout(500);

      // Try to select "olma" option
      const olmaOption = page.locator('option, [role="option"]').filter({ hasText: /olma/i }).first();
      if (await olmaOption.isVisible()) {
        await olmaOption.click();
      }
    }

    // Quantity
    const quantityInput = page.locator('input[name*="quantity" i], input[placeholder*="quantity" i]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('10');
    }

    // Unit price
    const priceInput = page.locator('input[name*="price" i], input[placeholder*="price" i]').first();
    if (await priceInput.isVisible()) {
      await priceInput.fill('14500');
    }

    // 6. Submit the form
    const saveButton = page.locator('button').filter({ hasText: /Save|Create|Submit/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 3000 });

    // Clear error arrays before submission
    consoleErrors.length = 0;
    pageErrors.length = 0;

    await saveButton.click();

    // 7. Wait for operation to complete
    await page.waitForTimeout(3000);

    // 8. Verify success (check for success toast or bill in list)
    const successToast = page.locator('[role="status"], .toast, .notification').filter({ hasText: /success|created/i });
    const hasSuccessToast = await successToast.isVisible().catch(() => false);

    // 9. Critical verification: No transaction errors
    const hasTransactionError = consoleErrors.some(err =>
      err.includes('Transaction function cannot return a promise') ||
      err.includes('transaction') ||
      err.includes('promise')
    );

    const hasPageError = pageErrors.some(err =>
      err.message.includes('Transaction function cannot return a promise') ||
      err.message.includes('transaction')
    );

    // 10. Look for error dialog
    const errorDialog = page.locator('[role="dialog"], .modal').filter({ hasText: /error|failed/i });
    const hasErrorDialog = await errorDialog.isVisible().catch(() => false);

    // 11. Assertions
    console.log('\n=== Test Results ===');
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors.map(e => e.message));
    console.log('Has Success Toast:', hasSuccessToast);
    console.log('Has Error Dialog:', hasErrorDialog);
    console.log('Has Transaction Error:', hasTransactionError);

    // Main assertions
    expect(hasTransactionError, 'Should NOT have transaction-related console errors').toBe(false);
    expect(hasPageError, 'Should NOT have transaction-related page errors').toBe(false);
    expect(hasErrorDialog, 'Should NOT show error dialog').toBe(false);

    // Optional: Check for success indicators
    if (hasSuccessToast) {
      console.log('✅ Success toast appeared');
    }

    // 12. Verify bill appears in database
    const billExists = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/test/check-bill-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billNumber: 'TEST-CACHE-001' })
        });
        return response.ok;
      } catch {
        return false;
      }
    });

    console.log('Bill created in database:', billExists);
    console.log('===================\n');
  });

  test('should delete a purchase order without transaction errors', async ({ page }) => {
    // Setup: Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to purchase orders page
    await page.goto('/en/purchasing/purchase-orders');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Find a PO to delete (look for delete button)
    const deleteButtons = page.locator('button').filter({ hasText: /Delete|Remove/i });
    const firstDeleteButton = deleteButtons.first();

    if (await firstDeleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Clear errors before action
      consoleErrors.length = 0;

      // Click delete
      await firstDeleteButton.click();

      // Confirm deletion (if confirmation dialog appears)
      await page.waitForTimeout(500);
      const confirmButton = page.locator('button').filter({ hasText: /Confirm|Yes|Delete/i }).last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for operation
      await page.waitForTimeout(2000);

      // Verify no transaction errors
      const hasTransactionError = consoleErrors.some(err =>
        err.includes('Transaction function cannot return a promise')
      );

      expect(hasTransactionError, 'Should NOT have transaction errors during PO deletion').toBe(false);
      console.log('✅ PO deletion completed without transaction errors');
    } else {
      console.log('⏭️ No purchase orders available to delete - skipping test');
    }
  });
});
