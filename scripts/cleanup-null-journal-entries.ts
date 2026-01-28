import { db } from '../db/index';
import { journalEntries, journalEntryLines } from '../db/schema/finance';
import { isNull, eq, or, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function cleanupNullJournalEntries() {
  console.log('🧹 Cleaning up journal entries with NULL transaction_id...\n');

  // Find entries with NULL or empty transaction_id
  const nullEntries = await db.select()
    .from(journalEntries)
    .where(
      or(
        isNull(journalEntries.transactionId),
        eq(journalEntries.transactionId, '')
      )
    );

  console.log(`📊 Found ${nullEntries.length} entries with NULL/empty transaction_id\n`);

  if (nullEntries.length === 0) {
    console.log('✅ No NULL entries to clean up!');
    return;
  }

  for (const je of nullEntries) {
    console.log(`   - JE #${je.id}: ${je.description} (${new Date(je.date).toLocaleDateString()})`);
  }

  console.log('\n🔄 Deleting entries...\n');

  const jeIds = nullEntries.map(je => je.id);

  // Delete lines first
  await db.delete(journalEntryLines)
    .where(inArray(journalEntryLines.journalEntryId, jeIds));

  // Delete entries
  await db.delete(journalEntries)
    .where(inArray(journalEntries.id, jeIds));

  console.log(`✅ Deleted ${jeIds.length} journal entries and their lines\n`);

  // Show updated balances
  const apBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '2100'));

  const invBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '1310'));

  const apTotal = apBalance.reduce((sum, line) => sum + (line.credit - line.debit), 0);
  const invTotal = invBalance.reduce((sum, line) => sum + (line.debit - line.credit), 0);

  console.log('=' .repeat(70));
  console.log('📈 Final Account Balances:');
  console.log(`   2100 (Accounts Payable): ${(apTotal/100).toLocaleString()} (Credit)`);
  console.log(`   1310 (Inventory): ${(invTotal/100).toLocaleString()} (Debit)`);
  console.log('=' .repeat(70));
}

cleanupNullJournalEntries()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
