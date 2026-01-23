# Business Type System E2E Tests

This directory contains comprehensive end-to-end tests for the LAZA ERP business type system, including setup flows, module access control, and business type switching.

## Test Structure

```
tests/e2e/
├── business-type-manufacturing.spec.ts     # Manufacturing business type flow
├── business-type-wholesale.spec.ts         # Wholesale business type flow
├── business-type-retail.spec.ts            # Retail business type flow
├── business-type-service.spec.ts           # Service business type flow
├── business-type-switching.spec.ts         # Business type switching with warnings
└── module-access-control.spec.ts           # Module guard access control
```

## What's Tested

### Manufacturing Business Type
- ✓ Setup wizard flow and selection
- ✓ Manufacturing dashboard displays correctly
- ✓ All enabled modules are accessible (Manufacturing, Inventory, Purchasing, Sales, Finance, Assets, Production)
- ✓ Module guard prevents 404 errors for enabled modules

### Wholesale Business Type
- ✓ Business type switching from Manufacturing to Wholesale
- ✓ Correct modules enabled (Inventory, Purchasing, Sales, Finance)
- ✓ Manufacturing-only modules are disabled
- ✓ Module access control prevents unauthorized access

### Retail Business Type
- ✓ Business type switching to Retail
- ✓ Correct modules enabled (Inventory, Sales, Finance)
- ✓ Manufacturing, Production, and Purchasing disabled
- ✓ Retail-focused dashboard displays

### Service Business Type
- ✓ Business type switching to Service
- ✓ Correct modules enabled (Sales, Finance)
- ✓ Inventory, Purchasing, Manufacturing, Production, and Assets disabled
- ✓ Service-focused dashboard for project-based businesses

### Business Type Switching
- ✓ Warning modal displays when switching business types
- ✓ Users can cancel or proceed with switch
- ✓ Module availability updates after switch
- ✓ No stale module access after switching

### Module Access Control
- ✓ Protected pages load without errors
- ✓ ModuleGuard blocks disabled modules
- ✓ Context initializes before rendering protected content
- ✓ Navigation between modules works correctly
- ✓ Multiple pages in same module are all protected
- ✓ Both shallow (/module) and deep (/module/subpath) routes are protected

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:ui
```
This opens an interactive test runner where you can:
- Watch tests run in real-time
- Filter tests by name
- Re-run individual tests
- See detailed error messages

### Run Tests in Debug Mode
```bash
npm run test:debug
```
Opens Playwright Inspector for step-by-step debugging

### View Test Report
```bash
npm run test:report
```
Opens HTML report of the last test run with details, screenshots, and traces

## Test Flow

The tests are designed to run sequentially because they share database state:

1. **First test creates the initial setup** (Manufacturing business type)
2. **Subsequent tests verify module access** for that business type
3. **Switching tests change the business type** to test new configurations
4. **Each business type test verifies** its specific module configuration
5. **Module access tests verify** guard protection for disabled modules

## Expected Test Results

All tests should pass when:
- The business type system is properly initialized
- ModuleGuard components are correctly protecting routes
- Module configuration matches the implementation
- Context providers are working correctly
- Navigation between business types functions properly

## Troubleshooting

### Tests Fail at Setup Wizard
- **Issue**: Selector for business type card not finding elements
- **Solution**: Check that `SetupWizard.tsx` renders cards with visible text labels
- **Debug**: Run with `npm run test:ui` to see actual page content

### ModuleGuard Tests Fail
- **Issue**: Module appears as enabled when it should be disabled
- **Solution**: Verify `BUSINESS_TYPES` config in `src/config/modules.ts` has correct module lists
- **Debug**: Check browser console for context initialization errors

### Business Type Switch Doesn't Work
- **Issue**: Modal doesn't appear or button not clickable
- **Solution**: Verify business settings page exists at `/settings/business`
- **Debug**: Navigate manually and check for JavaScript errors

### Intermittent Failures
- **Issue**: Tests fail sporadically on slow systems
- **Solution**: Increase timeouts in `playwright.config.ts`
- **Example**: Change `timeout: 120000` to `timeout: 180000`

## Performance Notes

- **Full test suite**: ~5-10 minutes depending on system
- **Single test file**: ~1-2 minutes
- **UI mode**: Opens test runner (no time limit)
- **Tests run sequentially** by design to maintain database state

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run E2E Tests
  run: npm test
  env:
    CI: true
```

The config will automatically:
- Use 1 worker (sequential execution)
- Retry failed tests 2 times
- Generate HTML report
- Use existing server if available

## Adding New Tests

When adding new tests:

1. Create file in `tests/e2e/` with `.spec.ts` extension
2. Use same import pattern: `import { test, expect } from '@playwright/test';`
3. Group related tests in `test.describe()` blocks
4. Use descriptive test names starting with verbs
5. Add `test.beforeEach()` for setup if needed

Example:
```typescript
test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('h1')).toContainText('Something');
  });
});
```

## Key Test Patterns Used

### Navigation + Visibility Check
```typescript
await page.goto('/route');
await expect(page.locator('h1')).toBeVisible();
```

### Content Verification
```typescript
await expect(page.locator('text=/pattern/i')).toBeVisible();
```

### Module Guard Verification
```typescript
await expect(page.locator('body')).not.toContainText('not enabled for this business type');
```

### Modal Interaction
```typescript
await page.locator('button').filter({ hasText: /Switch/ }).click();
await expect(page.locator('h2')).toContainText('Warning');
```

## Notes

- Tests use `localhost:3000` as base URL (configurable in `playwright.config.ts`)
- Dev server automatically starts before tests (can be disabled with `reuseExistingServer`)
- Screenshots captured on failure automatically
- Video traces available for debugging
- All tests are read-only (no data modification beyond setup)
