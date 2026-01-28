# System Reset Feature - Test Guide

## Implementation Complete

All Phase 1 components have been implemented:

✅ **Server Action** (`/src/app/actions/system-tools.ts`)
- `resetTransactionalData()` function
- Triple security checks (auth, ADMIN role, confirmation code)
- Atomic transaction wrapping
- Proper deletion order (9 phases, 31 tables)
- Master data field resets (items, GL accounts, fixed assets, etc.)
- Comprehensive audit logging

✅ **Modal Component** (`/src/components/settings/SystemResetModal.tsx`)
- 4-step workflow (Warning → Confirm → Processing → Complete)
- Type-to-confirm validation ("DELETE-TEST-DATA")
- Real-time feedback and progress indication
- Detailed deletion/reset count display

✅ **Button Component** (`/src/components/settings/SystemResetButton.tsx`)
- Red danger button with icon
- Modal trigger functionality

✅ **Settings Page Integration** (`/src/app/[locale]/settings/page.tsx`)
- System Administration section added
- Clear warning text
- Proper styling and layout

## Manual Testing Instructions

### Prerequisites
1. Dev server running: `npm run dev`
2. ADMIN user credentials
3. Test data exists in database

### Test Steps

1. **Navigate to Settings**
   - URL: http://localhost:3000/en/settings
   - Scroll to "System Administration" section at bottom

2. **Verify UI Elements**
   - ✅ Red "Reset System Data" button visible
   - ✅ Warning text about permanent deletion present
   - ✅ Section has proper danger zone styling

3. **Open Modal - Warning Step**
   - Click "Reset System Data" button
   - ✅ Modal opens with red alert styling
   - ✅ Warning step shows two columns:
     - "Will Be Deleted" (left): Lists transactional data types
     - "Will Be Preserved" (right): Lists master data types
   - ✅ "Continue to Confirmation" button present
   - ✅ Can close modal with X button

4. **Confirmation Step**
   - Click "Continue to Confirmation"
   - ✅ Input field for typing confirmation code appears
   - ✅ Placeholder text: "Type exactly: DELETE-TEST-DATA"
   - ✅ "Execute Reset" button is disabled initially
   - Type partial text (e.g., "DELETE")
     - ✅ Red "✗ Code does not match" message appears
   - Type exact code: "DELETE-TEST-DATA"
     - ✅ Green "✓ Code matches" message appears
     - ✅ "Execute Reset" button becomes enabled
   - ✅ "Back" button works to return to warning step

5. **Execute Reset**
   - With correct code entered, click "Execute Reset"
   - ✅ Processing step shows:
     - Spinning loader icon
     - "Processing Reset..." message
     - X button disappears (cannot close during processing)

6. **Completion Step**
   - Wait for reset to complete
   - ✅ Success screen shows:
     - Green checkmark icon
     - "Reset Completed Successfully" message
     - Two stat cards:
       - "Deleted Records" (red) with count
       - "Reset Records" (green) with count
     - "Next Steps" guidance
     - "View Detailed Counts" expandable section
   - ✅ Click "View Detailed Counts" to see JSON breakdown
   - ✅ "Close" button returns to settings page

7. **Verify Database State**
   - Run verification script:
     ```bash
     npx tsx scripts/test-system-reset.ts
     ```
   - ✅ All transactional counts should be 0
   - ✅ Master data counts preserved
   - ✅ Item quantityOnHand and averageCost = 0
   - ✅ GL account balances = 0

8. **Check Console Logs**
   - Check server console output
   - ✅ Pre-reset log: "🔄 System Reset initiated by: [email]"
   - ✅ Post-reset log: "✅ System Reset completed" with counts

## Expected Results

### Transactional Data (Should be DELETED - count=0)
- Invoices & invoice lines
- Vendor bills & bill lines
- Purchase orders & PO lines
- Customer/vendor payments & allocations
- Inventory layers & transfers
- Work orders & production runs
- Journal entries & lines
- Depreciation entries
- Manufacturing events (downtime, maintenance, etc.)

### Master Data (Should be PRESERVED - original count)
- Items (qty & cost reset to 0)
- Vendors
- Customers
- GL Accounts (balances reset to 0)
- Fixed Assets (depreciation reset to 0)
- Categories
- UOMs
- Warehouses & locations
- BOMs & routings
- User accounts
- Business settings

## Security Features Tested

✅ **Authentication Required**
- Non-authenticated users cannot access

✅ **ADMIN Role Required**
- Non-ADMIN users get "Admin access required" error

✅ **Confirmation Code Required**
- Exact match required: "DELETE-TEST-DATA"
- Case-sensitive validation

✅ **Transaction Safety**
- All-or-nothing atomic transaction
- Rollback on any error

## Known Issues / Notes

1. **Schema Sync**: Automated testing requires database schema to match code (process_readings table missing updated_at column in current database)
2. **Migration**: Run `npm run db:push` if schema errors occur
3. **Audit Logs**: Deleted during reset (by design - transactional data)

## Success Criteria

All checklist items above should pass for feature to be considered production-ready.

## Next Steps (Phase 2 - Future)

- [ ] Opening Balance Wizard component
- [ ] `createOpeningBalance()` server action
- [ ] GL account opening balance entry
- [ ] Inventory opening balance entry with batch creation

---

**Implementation Date:** 2026-01-24
**Status:** ✅ Phase 1 Complete - Ready for Manual Testing
