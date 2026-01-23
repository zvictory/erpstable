import { test, expect } from '@playwright/test';

/**
 * E2E Test: Sublimation Stage with Quality Metrics Tracking
 *
 * Tests the complete sublimation (freeze-drying) workflow with Phase 1B enhancements:
 * - Equipment unit selection (freeze-dryer)
 * - Quality metrics entry (moisture, visual quality, consistency)
 * - Cost calculation with equipment tracking
 * - Data persistence in database
 *
 * Prerequisites:
 * - Application running on localhost:3000 or defined BASE_URL
 * - Test user with FACTORY_WORKER role in database
 * - Sample work order with sublimation step
 */

test.describe('Sublimation Stage with Quality Metrics', () => {
  const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to manufacturing production page
    await page.goto(`${BASE_URL}/en/manufacturing/production`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="work-order-list"]', { timeout: 10000 });
  });

  test('should complete sublimation stage with quality metrics', async ({ page }) => {
    // Step 1: Find and click on a work order with sublimation step
    await page.click('[data-testid="work-order-WO-001"]');

    // Step 2: Wait for production terminal to load
    await page.waitForSelector('[data-testid="stage-executor-container"]', { timeout: 5000 });

    // Step 3: Verify we're on sublimation stage
    const stageTitle = await page.locator('text=Sublimation').first();
    await expect(stageTitle).toBeVisible();

    // ========== OPERATOR SELECTION ==========
    // Step 4: Select operator
    await page.click('[data-testid="operator-selector"]');
    await page.waitForSelector('[data-testid="operator-option"]', { timeout: 5000 });

    // Click first available operator
    const firstOperator = await page.locator('[data-testid="operator-option"]').first();
    await firstOperator.click();

    // Verify operator is selected
    const selectedOperator = await page.locator('[data-testid="selected-operator"]');
    await expect(selectedOperator).toBeVisible();

    // ========== EQUIPMENT UNIT SELECTION ==========
    // Step 5: Select freeze-dryer equipment unit
    await page.click('[data-testid="equipment-unit-selector"]');
    await page.waitForSelector('[data-testid="equipment-unit-option"]', { timeout: 5000 });

    // Select freeze-dryer FD-001
    const fdUnit = await page.locator('text=FD-001').first();
    if (await fdUnit.isVisible()) {
      await fdUnit.click();

      // Verify equipment is selected (should show capacity info)
      const capacityDisplay = await page.locator('[data-testid="equipment-capacity"]');
      await expect(capacityDisplay).toContainText(/\d+/); // Should show a number (capacity)
    }

    // ========== TIMER OPERATION ==========
    // Step 6: Start timer
    const startButton = await page.locator('[data-testid="stopwatch-start"]');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify timer is running
    let timerDisplay = await page.locator('[data-testid="stopwatch-display"]');
    await expect(timerDisplay).toBeVisible();

    // Step 7: Simulate 2 minutes of processing
    await page.waitForTimeout(2000);

    // Step 8: Stop timer
    const stopButton = await page.locator('[data-testid="stopwatch-stop"]');
    await stopButton.click();

    // Verify timer is stopped
    timerDisplay = await page.locator('[data-testid="stopwatch-display"]');
    const timerText = await timerDisplay.textContent();
    expect(timerText).toMatch(/\d+\s*(min|m)/);

    // ========== OUTPUT QUANTITY ==========
    // Step 9: Enter output quantity
    const outputInput = await page.locator('[data-testid="output-qty-input"]');
    await outputInput.fill('10.5');

    // Verify yield calculation appears
    await page.waitForSelector('[data-testid="yield-display"]', { timeout: 5000 });
    const yieldDisplay = await page.locator('[data-testid="yield-display"]');
    await expect(yieldDisplay).toBeVisible();

    // ========== QUALITY METRICS ==========
    // Step 10: Enter moisture content (target <5%)
    const moistureInput = await page.locator('[data-testid="moisture-content-input"]');
    await moistureInput.fill('3.2');

    // Verify moisture status indicator
    const moistureStatus = await page.locator('[data-testid="moisture-status"]');
    await expect(moistureStatus).toContainText(/within target|success/i);

    // Step 11: Select visual quality
    const visualQualitySelect = await page.locator('[data-testid="visual-quality-select"]');
    await visualQualitySelect.selectOption('excellent');

    // Verify visual quality description appears
    const qualityDescription = await page.locator('[data-testid="quality-description"]');
    await expect(qualityDescription).toBeVisible();

    // Step 12: Set color consistency rating
    const colorRating4 = await page.locator('[data-testid="color-rating-4"]');
    if (await colorRating4.isVisible()) {
      await colorRating4.click();

      // Verify button is selected (visual feedback)
      await expect(colorRating4).toHaveClass(/bg-blue-600/);
    }

    // Step 13: Set texture score rating
    const textureRating4 = await page.locator('[data-testid="texture-rating-4"]');
    if (await textureRating4.isVisible()) {
      await textureRating4.click();

      // Verify button is selected
      await expect(textureRating4).toHaveClass(/bg-blue-600/);
    }

    // Step 14: Add operator notes
    const notesTextarea = await page.locator('[data-testid="quality-notes"]');
    await notesTextarea.fill('Batch processed smoothly, no equipment issues');

    // ========== QUALITY SUMMARY ==========
    // Step 15: Verify quality summary card appears
    const qualitySummary = await page.locator('[data-testid="quality-summary"]');
    await expect(qualitySummary).toBeVisible();

    // Verify excellent quality indication
    const excellentQualityText = await page.locator('text=Excellent Quality');
    await expect(excellentQualityText).toBeVisible();

    // ========== COST DISPLAY ==========
    // Step 16: Verify cost is calculated
    const costDisplay = await page.locator('[data-testid="electricity-cost"]');
    await expect(costDisplay).toBeVisible();

    // Verify cost shows in Tiyin (should have a number)
    const costValue = await costDisplay.textContent();
    expect(costValue).toMatch(/\d+/);

    // ========== SUBMISSION ==========
    // Step 17: Submit production stage
    const submitButton = await page.locator('[data-testid="submit-stage-button"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 18: Verify success message
    const successMessage = await page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(successMessage).toContainText(/success|completed|submitted/i);

    // Step 19: Verify step shows as completed
    const completedStatus = await page.locator('[data-testid="step-status-completed"]');
    await expect(completedStatus).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    // Select a work order
    await page.click('[data-testid="work-order-WO-001"]');
    await page.waitForSelector('[data-testid="stage-executor-container"]', { timeout: 5000 });

    // Try to submit without filling required fields
    const submitButton = await page.locator('[data-testid="submit-stage-button"]');
    await submitButton.click();

    // Verify validation errors appear
    const errorMessage = await page.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toBeVisible();

    // Verify it mentions operator is required
    await expect(errorMessage).toContainText(/operator|assign/i);
  });

  test('should track moisture content moisture warning', async ({ page }) => {
    // Select work order and operator
    await page.click('[data-testid="work-order-WO-001"]');
    await page.waitForSelector('[data-testid="stage-executor-container"]', { timeout: 5000 });

    await page.click('[data-testid="operator-selector"]');
    const firstOperator = await page.locator('[data-testid="operator-option"]').first();
    await firstOperator.click();

    // Start timer
    await page.click('[data-testid="stopwatch-start"]');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="stopwatch-stop"]');

    // Enter output
    const outputInput = await page.locator('[data-testid="output-qty-input"]');
    await outputInput.fill('10.5');

    // Enter HIGH moisture content (>7% - outside spec)
    const moistureInput = await page.locator('[data-testid="moisture-content-input"]');
    await moistureInput.fill('8.5');

    // Verify moisture status shows warning
    const moistureStatus = await page.locator('[data-testid="moisture-status"]');
    await expect(moistureStatus).toContainText(/outside|high|warning/i);

    // Verify moisture gauge shows in red
    const moistureGauge = await page.locator('[data-testid="moisture-gauge"]');
    await expect(moistureGauge).toHaveClass(/bg-red/);
  });

  test('should calculate quality score from all metrics', async ({ page }) => {
    // Select work order and operator
    await page.click('[data-testid="work-order-WO-001"]');
    await page.waitForSelector('[data-testid="stage-executor-container"]', { timeout: 5000 });

    await page.click('[data-testid="operator-selector"]');
    const firstOperator = await page.locator('[data-testid="operator-option"]').first();
    await firstOperator.click();

    // Start and stop timer
    await page.click('[data-testid="stopwatch-start"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="stopwatch-stop"]');

    // Enter output
    const outputInput = await page.locator('[data-testid="output-qty-input"]');
    await outputInput.fill('10.5');

    // Test with LOW scores (fair to poor quality)
    const moistureInput = await page.locator('[data-testid="moisture-content-input"]');
    await moistureInput.fill('6.5'); // High but acceptable

    const visualQualitySelect = await page.locator('[data-testid="visual-quality-select"]');
    await visualQualitySelect.selectOption('fair');

    const colorRating2 = await page.locator('[data-testid="color-rating-2"]');
    if (await colorRating2.isVisible()) {
      await colorRating2.click();
    }

    // Verify quality summary shows caution (not excellent)
    const qualitySummary = await page.locator('[data-testid="quality-summary"]');
    await expect(qualitySummary).toBeVisible();

    // Should show "Good Quality" or "Quality Review Needed" - not "Excellent"
    const goodQualityText = await page.locator('text=/Good Quality|Quality Review/');
    await expect(goodQualityText).toBeVisible();
  });
});
