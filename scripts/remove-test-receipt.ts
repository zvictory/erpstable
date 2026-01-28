/**
 * Script to remove TEST-RECEIPT-001 transaction from the database
 *
 * This script:
 * 1. Finds journal entries with reference or transactionId containing 'TEST-RECEIPT'
 * 2. Deletes associated journal_entry_lines (FK constraint)
 * 3. Deletes the journal_entry
 * 4. Recalculates affected account balances
 */

import { db } from '../db';
import { journalEntries, journalEntryLines, glAccounts } from '../db/schema';
import { eq, or, like, sql } from 'drizzle-orm';

async function removeTestReceipt() {
  console.log('🔍 Searching for TEST-RECEIPT transactions...\n');

  // Find all journal entries with TEST-RECEIPT reference
  const testEntries = await db
    .select()
    .from(journalEntries)
    .where(
      or(
        like(journalEntries.reference, '%TEST-RECEIPT%'),
        like(journalEntries.transactionId, '%TEST-RECEIPT%')
      )
    );

  if (testEntries.length === 0) {
    console.log('✅ No TEST-RECEIPT transactions found. Database is clean.');
    return;
  }

  console.log(`Found ${testEntries.length} TEST-RECEIPT transaction(s):\n`);

  for (const entry of testEntries) {
    console.log(`Journal Entry ID: ${entry.id}`);
    console.log(`  Reference: ${entry.reference}`);
    console.log(`  Transaction ID: ${entry.transactionId}`);
    console.log(`  Description: ${entry.description}`);
    console.log(`  Date: ${entry.date}`);
    console.log(`  Posted: ${entry.isPosted ? 'Yes' : 'No'}\n`);

    // Get associated lines
    const lines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, entry.id));

    console.log(`  Associated Lines (${lines.length}):`);
    const affectedAccounts = new Set<string>();

    for (const line of lines) {
      console.log(`    Account ${line.accountCode}: Dr ${line.debit}, Cr ${line.credit}`);
      affectedAccounts.add(line.accountCode);
    }
    console.log();

    // Delete journal entry lines first (FK constraint)
    console.log(`🗑️  Deleting ${lines.length} journal entry lines...`);
    await db
      .delete(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, entry.id));
    console.log('✅ Journal entry lines deleted\n');

    // Delete journal entry
    console.log(`🗑️  Deleting journal entry ${entry.id}...`);
    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, entry.id));
    console.log('✅ Journal entry deleted\n');

    // Recalculate affected account balances
    console.log('🔄 Recalculating account balances...');
    for (const accountCode of affectedAccounts) {
      // Sum all debits and credits for this account
      const result = await db
        .select({
          totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
          totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
        })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.accountCode, accountCode));

      const totalDebit = result[0]?.totalDebit || 0;
      const totalCredit = result[0]?.totalCredit || 0;

      // Get account type to determine balance calculation
      const account = await db
        .select()
        .from(glAccounts)
        .where(eq(glAccounts.code, accountCode))
        .limit(1);

      if (account.length === 0) {
        console.log(`  ⚠️  Account ${accountCode} not found in glAccounts`);
        continue;
      }

      const accountType = account[0].type;

      // Calculate balance based on account type
      // Assets & Expenses: Debit increases balance (Debit - Credit)
      // Liabilities, Equity, Revenue: Credit increases balance (Credit - Debit)
      let newBalance: number;
      if (accountType === 'Asset' || accountType === 'Expense') {
        newBalance = totalDebit - totalCredit;
      } else {
        newBalance = totalCredit - totalDebit;
      }

      // Update account balance
      await db
        .update(glAccounts)
        .set({ balance: newBalance })
        .where(eq(glAccounts.code, accountCode));

      console.log(`  ✅ Account ${accountCode} (${account[0].name}): Updated balance to ${newBalance} tiyin`);
    }
    console.log();
  }

  console.log('🎉 TEST-RECEIPT cleanup completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Verify account 1310 register at /ru/finance/accounts/1310');
  console.log('  2. Check that TEST-RECEIPT-001 is no longer visible');
  console.log('  3. Verify account balance is correct\n');
}

// Run the script
removeTestReceipt()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error removing TEST-RECEIPT:', error);
    process.exit(1);
  });
