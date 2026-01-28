# Payroll Module Database Setup

This directory contains migration scripts for setting up the payroll module.

## Quick Setup (Recommended)

Run the complete setup script to do everything in one command:

```bash
npx tsx db/migrations/setup-payroll-complete.ts
```

This will:
1. ✅ Create 4 payroll tables
2. ✅ Seed 10 GL accounts for payroll
3. ✅ Add compensation records for all active users

## Individual Scripts

If you prefer to run steps individually:

### Step 1: Create Tables

```bash
npx tsx db/migrations/add-payroll-tables.ts
```

Creates:
- `payroll_periods` - Master table for payroll cycles
- `payslips` - Per-employee pay records
- `payslip_items` - Line items (earnings/deductions)
- `employee_compensation` - Temporal salary history

### Step 2: Seed GL Accounts

```bash
npx tsx db/migrations/seed-payroll-gl-accounts.ts
```

Adds 10 accounts:
- **Expense accounts (6010-6050):**
  - 6010 - Salary Expense
  - 6020 - Wage Expense
  - 6030 - Overtime Expense
  - 6040 - Bonus Expense
  - 6050 - Payroll Tax Expense

- **Liability accounts (2400-2440):**
  - 2400 - Salaries Payable
  - 2410 - Income Tax Withheld
  - 2420 - Pension Fund Payable
  - 2430 - Social Tax Payable
  - 2440 - Insurance Payable

### Step 3: Seed Employee Compensation

```bash
npx tsx db/migrations/seed-employee-compensation.ts
```

Adds compensation records for all active users with default salaries:
- Admin: 10,000,000 UZS/month
- Accountant: 8,000,000 UZS/month
- Plant Manager: 7,000,000 UZS/month
- Factory Worker: 5,000,000 UZS/month

## After Setup

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `/hr/payroll`

3. **Test the workflow:**
   - Create a new payroll period
   - Review generated payslips
   - Approve the period (creates GL entries)
   - Process payment (clears liabilities)

## Database Schema

### payroll_periods
- Tracks payroll cycles (monthly periods)
- Status: DRAFT → APPROVED → PAID
- Links to journal entries for GL integration

### payslips
- One record per employee per period
- Stores gross pay, deductions, net pay
- Can be individually managed

### payslip_items
- Line items for each payslip
- Types: EARNING, DEDUCTION, TAX
- Links to GL accounts

### employee_compensation
- Temporal table (tracks salary changes)
- Supports monthly salary or hourly wage
- effectiveTo = NULL means current compensation

## Important Notes

- **All monetary amounts stored in Tiyin (1/100 UZS)**
- **Tax rates:** 12% income tax, 8% pension fund
- **GL integration:** Creates double-entry journal entries
- **Approval workflow:** Only ADMIN can approve payroll
- **Period locking:** Approved periods cannot be edited

## Troubleshooting

**No users found:**
- Make sure you have active users in the database
- Run user creation scripts first

**Tables already exist:**
- Scripts are idempotent and safe to re-run
- Existing data won't be affected

**GL accounts skipped:**
- Normal if accounts already exist
- Check `/finance/chart-of-accounts` to verify

## Support

For issues or questions, check:
- Main implementation plan in project root
- CLAUDE.md for coding standards
- GEMINI_CONTEXT.md for architecture
