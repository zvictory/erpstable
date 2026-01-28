/**
 * Fix cached balance for Account 1340 (Finished Goods)
 *
 * The verification script detected that account 1340 has:
 * - Calculated balance: 0.00 UZS
 * - Cached balance: 29,500.00 UZS
 *
 * This script recalculates the balance from journal entry lines and updates the cached value.
 */

import { db } from '../db';
import { journalEntryLines, glAccounts } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function fixAccount1340Balance() {
  console.log('🔧 Fixing cached balance for Account 1340 (Finished Goods)...\n');

  const accountCode = '1340';

  // Get current cached balance
  const account = await db
    .select()
    .from(glAccounts)
    .where(eq(glAccounts.code, accountCode))
    .limit(1);

  if (account.length === 0) {
    console.log(`❌ Account ${accountCode} not found`);
    return;
  }

  console.log(`Current cached balance: ${(account[0].balance / 100).toFixed(2)} UZS`);

  // Calculate actual balance from journal entry lines
  const result = await db
    .select({
      totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, accountCode));

  const totalDebit = result[0]?.totalDebit || 0;
  const totalCredit = result[0]?.totalCredit || 0;

  // For Asset accounts: Balance = Debit - Credit
  const calculatedBalance = totalDebit - totalCredit;

  console.log(`\nCalculated balance from journal entries:`);
  console.log(`  Total Debits:  ${(totalDebit / 100).toFixed(2)} UZS`);
  console.log(`  Total Credits: ${(totalCredit / 100).toFixed(2)} UZS`);
  console.log(`  Balance:       ${(calculatedBalance / 100).toFixed(2)} UZS`);

  if (account[0].balance === calculatedBalance) {
    console.log('\n✅ Balance is already correct - no update needed');
    return;
  }

  // Update cached balance
  console.log('\n🔄 Updating cached balance...');

  await db
    .update(glAccounts)
    .set({ balance: calculatedBalance })
    .where(eq(glAccounts.code, accountCode));

  console.log(`✅ Updated account ${accountCode} cached balance to ${(calculatedBalance / 100).toFixed(2)} UZS`);

  console.log('\n🎉 Balance fix completed successfully!');
}

fixAccount1340Balance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
