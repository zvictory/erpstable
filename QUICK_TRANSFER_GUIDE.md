# Quick Transfer Guide 🚀

**Status:** ✅ Fully Implemented & Ready to Use

---

## 🎯 What is the Transfer System?

The Internal Transfer System allows you to move funds between your cash and bank accounts (like QuickBooks "Transfer Funds" feature).

**Use Cases:**
- Transfer money from bank to petty cash
- Move funds between different bank accounts
- Consolidate cash from multiple locations
- Rebalance account distributions

---

## ⚡ Quick Start (3 Steps)

### 1. Navigate to Cash Accounts
**URL:** `/finance/cash-accounts`

**Or:** Click "Денежные Счета" in the Finance sidebar menu

### 2. Click "New Transfer" Button
**Russian:** "Новый Перевод"

**Or:** Click "Перевести" (Transfer Out) on any account card

### 3. Fill the Form & Submit
- **From Account:** Where the money comes from
- **To Account:** Where the money goes
- **Amount:** How much (in UZS)
- **Date:** When (defaults to today)
- **Memo:** Why (required)

**Click:** "Выполнить Перевод" (Execute Transfer)

✅ **Done!** The transfer is recorded immediately.

---

## 📊 What You'll See

### Cash Accounts Dashboard
```
┌─────────────────────────────────────────┐
│  Денежные Счета                   [New] │
│  Управление денежными средствами        │
├─────────────────────────────────────────┤
│  📊 KPI Cards                           │
│  • Total Balance: 1,234,567 UZS        │
│  • Active Accounts: 5                   │
│  • Recent Transfers: 12                 │
├─────────────────────────────────────────┤
│  💳 Account Cards (Grid)                │
│  ┌─────────────┬─────────────┬────────┐│
│  │ Main Bank   │ Petty Cash  │ Other  ││
│  │ 500,000 UZS │ 50,000 UZS  │ ...    ││
│  │[Transfer][In]│[Out][In]    │        ││
│  └─────────────┴─────────────┴────────┘│
├─────────────────────────────────────────┤
│  📋 Recent Transfers Table              │
│  Date       Ref         From → To  Amt  │
│  2026-01-28 TRF-2026-001 1110→1010 500 │
│  2026-01-27 TRF-2026-002 1010→1110 200 │
└─────────────────────────────────────────┘
```

### Transfer Modal
```
┌─────────────────────────────────────────┐
│  🔁 Перевод Средств              [X]    │
│  Перевод между денежными счетами        │
├─────────────────────────────────────────┤
│  ℹ️ Перевод будет записан немедленно.   │
│     Будет создана проводка в ГК.        │
├──────────────────┬──────────────────────┤
│ Со счета ▼       │ На счет ▼            │
│ 1110 - Main Bank │ 1010 - Petty Cash    │
│                  │                      │
│ Баланс до:       │ Баланс до:           │
│ 500,000 UZS      │ 50,000 UZS           │
│                  │                      │
│ Сумма (UZS) *    │ Примечание *         │
│ 10000            │ Replenish petty cash │
│                  │                      │
│ Дата *           │                      │
│ 2026-01-28       │                      │
│                  │                      │
│ Баланс после:    │ Баланс после:        │
│ 490,000 UZS ✅   │ 60,000 UZS ✅        │
├──────────────────┴──────────────────────┤
│                 [Cancel] [Submit]       │
└─────────────────────────────────────────┘
```

---

## 🧪 Try It Now (Test Scenario)

### Scenario: Replenish Office Petty Cash

**Situation:**
- Your bank account has 1,000,000 UZS
- Your petty cash has 20,000 UZS
- You need 50,000 UZS in petty cash for the week

**Steps:**
1. Go to `/finance/cash-accounts`
2. Click "Новый Перевод"
3. Fill form:
   - **From:** 1110 - Основной банковский счет
   - **To:** 1010 - Касса
   - **Amount:** 30000 (300 UZS)
   - **Date:** Today
   - **Memo:** "Пополнение кассы на неделю"
4. Review preview:
   - Bank after: 970,000 UZS
   - Petty Cash after: 50,000 UZS
5. Click "Выполнить Перевод"

**Result:**
✅ Transfer created with reference TRF-2026-XXX
✅ Journal entry posted to General Ledger
✅ Account balances updated
✅ Appears in transfer history

**Verify:**
- Check General Ledger: `/finance/general-ledger`
- Check Bank Register: `/finance/accounts/1110`
- Check Petty Cash Register: `/finance/accounts/1010`

---

## 💡 Pro Tips

### 1. Use Descriptive Memos
❌ Bad: "Transfer"
✅ Good: "Weekly petty cash replenishment for operations"

**Why:** Helps with auditing and understanding historical transfers

### 2. Use Account Cards for Quick Actions
Instead of clicking "New Transfer" → selecting accounts...
Click "Перевести" on the source account → only select destination!

### 3. Check Balance Preview
Before submitting, always check:
- ✅ From account won't go negative
- ✅ To account will have expected balance
- ✅ Amount is correct (remember: in UZS)

### 4. Reference Numbers are Sequential
- TRF-2026-001, TRF-2026-002, etc.
- Use these to track transfers in reports
- Reset each year (TRF-2027-001)

### 5. Transfers Can't Be Edited
Once created, transfers are permanent (for audit trail).
To "undo" a transfer:
1. Create a reverse transfer
2. Or contact accountant for journal entry reversal

---

## 🚫 Common Mistakes to Avoid

### 1. ❌ Entering Amount in Tiyin
**Wrong:** 5000000 (trying to transfer 50,000 UZS)
**Right:** 50000 (system multiplies by 100 internally)

**Remember:** Amount field is in UZS (full currency units)

### 2. ❌ Forgetting to Add Memo
The system requires a memo. Don't write generic text:
**Bad:** "Transfer"
**Good:** "Move funds for supplier payment tomorrow"

### 3. ❌ Transferring More Than Available
Watch the "Balance After" preview!
- Red text = Not enough money
- Green text = OK

### 4. ❌ Using Non-Cash Accounts
The system only shows Cash/Bank accounts (1000-1199).
You can't transfer:
- ❌ From Inventory accounts
- ❌ From Accounts Receivable
- ❌ From Fixed Assets

**Why:** These are not liquid assets.

### 5. ❌ Backdating Transfers to Closed Periods
If you see: "Period is closed" error
- Check the date field
- Ensure date is after the period lock date
- Contact accountant to reopen period if needed

---

## 🔍 How to Find Past Transfers

### Method 1: Cash Accounts Page
**Location:** `/finance/cash-accounts`
**Shows:** Last 20 transfers
**Columns:** Date, Reference, From/To, Amount

### Method 2: General Ledger
**Location:** `/finance/general-ledger`
**Filter by:** Entry Type = TRANSFER
**Shows:** All transfer journal entries with both DR/CR lines

### Method 3: Account Register
**Location:** `/finance/accounts/[code]`
**Example:** `/finance/accounts/1110` (Bank account)
**Shows:** All transactions for that account, including transfers
**Benefit:** See running balance after each transfer

---

## 📐 Accounting Behind the Scenes

### What Happens When You Transfer?

**Example:** Transfer 500 UZS from Bank to Petty Cash

**Journal Entry Created:**
```
Date: 2026-01-28
Reference: TRF-2026-001
Description: Replenish petty cash

DR  1010 - Petty Cash         500 UZS
    CR  1110 - Main Bank              500 UZS
```

**Impact on Accounts:**
- **Bank Account (1110):**
  - Before: 1,000 UZS
  - After: 500 UZS (decreased by 500)
- **Petty Cash (1010):**
  - Before: 100 UZS
  - After: 600 UZS (increased by 500)

**General Ledger:**
- Two lines appear (one DR, one CR)
- Both lines have same journal entry ID
- Entry Type marked as "TRANSFER"
- Balanced: 500 DR = 500 CR ✅

---

## 🛡️ Security & Permissions

### Who Can Create Transfers?
- ✅ **ADMIN** role
- ✅ **ACCOUNTANT** role
- ❌ Other roles (no access)

### Period Lock Protection
If period is locked (closed for editing):
- ❌ Cannot create transfers dated on/before lock date
- ✅ Can create transfers dated after lock date

**Example:**
- Lock date: 2025-12-31
- ❌ Cannot create transfer dated 2025-12-31
- ✅ Can create transfer dated 2026-01-01

### Audit Trail
Every transfer creates:
- ✅ Journal entry (permanent record)
- ✅ Reference number (unique identifier)
- ✅ Date and time stamp
- ✅ User who created it (via session)
- ✅ Memo/description

**Note:** Transfers cannot be deleted, only reversed.

---

## 📱 Responsive Design

The transfer system works on all devices:

### Desktop (1920px+)
- 3-column account cards
- Full table view
- Large modal

### Tablet (768px - 1919px)
- 2-column account cards
- Scrollable table
- Medium modal

### Mobile (< 768px)
- 1-column account cards
- Scrollable table
- Full-screen modal

**Tip:** For quick transfers on mobile, use account card buttons instead of New Transfer button.

---

## 🧩 Integration with Other Features

### 1. Write Check (Expenses)
**Location:** Expenses page → "Write Check"
**Integration:** Uses same account list (`getAssetAccounts()`)
**Benefit:** Consistent account selection

### 2. General Ledger
**Location:** `/finance/general-ledger`
**Integration:** Transfers automatically appear
**Filter:** Entry Type = TRANSFER
**Benefit:** See all transfers in GL context

### 3. Chart of Accounts
**Location:** `/finance/chart-of-accounts`
**Integration:** Account balances updated automatically
**Benefit:** Always current balance

### 4. Account Register
**Location:** `/finance/accounts/[code]`
**Integration:** Transfers appear in transaction list
**Benefit:** See transfer in account context with running balance

---

## 🆘 Troubleshooting

### Problem: Transfer button doesn't work
**Solution:**
1. Check browser console for errors (F12)
2. Refresh page (Ctrl+R / Cmd+R)
3. Clear browser cache

### Problem: "Insufficient balance" error
**Solution:**
1. Check current account balance (shown in card)
2. Ensure amount is less than available balance
3. Remember: amount is in UZS, not tiyin

### Problem: Modal doesn't close after submit
**Solution:**
1. Check for error message in modal
2. If stuck, refresh page and check if transfer was created
3. Check Recent Transfers table

### Problem: Transfer created but not showing
**Solution:**
1. Refresh page (Ctrl+R / Cmd+R)
2. Check General Ledger for transfer
3. Search by reference number (TRF-2026-XXX)

### Problem: Can't select account as "To Account"
**Solution:**
This is expected if:
1. Account is same as "From Account" (prevented)
2. Account is not a cash/bank account (filtered)
3. Account is inactive

---

## 📊 Reporting

### Current Period Transfers
```sql
SELECT
  date,
  reference,
  description,
  SUM(debit) as amount
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journalEntryId
WHERE entryType = 'TRANSFER'
  AND date >= '2026-01-01'
  AND date <= '2026-01-31'
GROUP BY je.id
ORDER BY date DESC;
```

### Transfers by Account
```sql
SELECT
  jel.accountCode,
  ga.name,
  SUM(jel.debit) as total_received,
  SUM(jel.credit) as total_sent
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journalEntryId = je.id
JOIN gl_accounts ga ON jel.accountCode = ga.code
WHERE je.entryType = 'TRANSFER'
GROUP BY jel.accountCode
ORDER BY ga.code;
```

---

## 🎓 Best Practices

### 1. Daily Reconciliation
- Review transfers daily
- Match against physical cash movements
- Verify account balances

### 2. Document Purpose
- Always write clear, descriptive memos
- Include date range if recurring (e.g., "Weekly petty cash 01/20-01/27")
- Reference related documents (e.g., "Per check #1234")

### 3. Regular Backups
- Transfers are in `journal_entries` table
- Backup database regularly
- Test restore process

### 4. Access Control
- Only grant ADMIN/ACCOUNTANT roles to trusted users
- Monitor transfer activity
- Review transfers monthly

### 5. Period Closing
- Review all transfers before closing period
- Ensure all transfers are legitimate
- Lock period to prevent backdated transfers

---

## ✅ Feature Checklist

What the Transfer System Does:
- ✅ Move funds between cash/bank accounts
- ✅ Create balanced journal entries (DR = CR)
- ✅ Validate account balances (prevent overdraft)
- ✅ Generate sequential reference numbers
- ✅ Show real-time balance preview
- ✅ Enforce period lock
- ✅ Require memo for audit trail
- ✅ Support multiple currencies (future)
- ✅ Responsive mobile design
- ✅ Role-based access control

What It Doesn't Do (Limitations):
- ❌ Edit/delete transfers (only reverse)
- ❌ Bulk transfers (one at a time)
- ❌ Recurring/scheduled transfers
- ❌ Transfer approvals (posts immediately)
- ❌ Transfer categories (all generic)

---

## 🚀 What's Next?

### Planned Enhancements (Future)
1. **Transfer Templates** - Save frequent transfers
2. **Recurring Transfers** - Schedule automatic transfers
3. **Bulk Import** - CSV upload for multiple transfers
4. **Transfer Approvals** - Multi-step approval workflow
5. **Transfer Categories** - Categorize transfers (operational, loan, etc.)
6. **Enhanced Filtering** - More filter options in history
7. **Mobile App** - Native mobile transfer app

### Request a Feature
If you need additional functionality, contact your development team with:
- **Use case:** Why you need it
- **Frequency:** How often you'd use it
- **Priority:** How important it is

---

## 📞 Support

### Documentation
- **Full Implementation Guide:** `TRANSFER_IMPLEMENTATION_VERIFIED.md`
- **System Architecture:** `GEMINI_CONTEXT.md`
- **Developer Guide:** `CLAUDE.md`

### Need Help?
1. Check this Quick Guide first
2. Review full documentation
3. Contact system administrator
4. Report bugs to development team

---

**Last Updated:** 2026-01-28
**Version:** 1.0
**Status:** ✅ Production Ready

---

**🎉 You're Ready to Use the Transfer System!**

Start with the test scenario above, then explore the features. The system is designed to be intuitive and safe - you can't break anything!
