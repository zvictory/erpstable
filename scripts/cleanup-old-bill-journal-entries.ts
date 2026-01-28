import { db } from '../db/index';
import { vendorBills } from '../db/schema/purchasing';
import { journalEntries, journalEntryLines } from '../db/schema/finance';
import { eq, like, inArray } from 'drizzle-orm';

async function cleanupOldJournalEntries() {
  console.log('🧹 Cleaning up old journal entries...\n');

  // Get all current bill IDs
  const currentBills = await db.select({ id: vendorBills.id }).from(vendorBills);
  const currentBillIds = currentBills.map(b => `bill-${b.id}`);

  console.log(`📋 Found ${currentBillIds.length} current bills\n`);

  // Get all bill-related journal entries
  const allBillJEs = await db.select()
    .from(journalEntries)
    .where(like(journalEntries.transactionId, 'bill-%'));

  console.log(`📊 Found ${allBillJEs.length} bill-related journal entries\n`);

  // Find entries to delete (not in current bills)
  const jesToDelete = allBillJEs.filter(je => {
    return je.transactionId && !currentBillIds.includes(je.transactionId);
  });

  console.log(`🗑️  Found ${jesToDelete.length} old entries to delete:\n`);

  for (const je of jesToDelete) {
    console.log(`   - JE #${je.id}: ${je.transactionId} - ${je.description}`);
  }

  if (jesToDelete.length === 0) {
    console.log('\n✅ No old entries to clean up!');
    return;
  }

  console.log('\n🔄 Deleting old journal entries and their lines...\n');

  const jeIdsToDelete = jesToDelete.map(je => je.id);

  // Delete journal entry lines first (foreign key)
  const deletedLines = await db.delete(journalEntryLines)
    .where(inArray(journalEntryLines.journalEntryId, jeIdsToDelete));

  // Delete journal entries
  const deletedEntries = await db.delete(journalEntries)
    .where(inArray(journalEntries.id, jeIdsToDelete));

  console.log(`✅ Deleted ${jeIdsToDelete.length} journal entries and their lines\n`);

  // Show updated balances
  const apBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '2100'));

  const invBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '1310'));

  const apTotal = apBalance.reduce((sum, line) => sum + (line.credit - line.debit), 0);
  const invTotal = invBalance.reduce((sum, line) => sum + (line.debit - line.credit), 0);

  const totalBills = await db.select()
    .from(vendorBills)
    .where(eq(vendorBills.status, 'OPEN'));

  const expectedAP = totalBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

  console.log('=' .repeat(70));
  console.log('📈 Account Balances After Cleanup:');
  console.log(`   2100 (Accounts Payable): ${(apTotal/100).toLocaleString()} (Credit)`);
  console.log(`   1310 (Inventory): ${(invTotal/100).toLocaleString()} (Debit)`);
  console.log(`\n   Expected AP from Bills: ${(expectedAP/100).toLocaleString()}`);
  console.log(`   Match: ${apTotal === expectedAP ? '✅ YES' : '❌ NO'}`);
  console.log('=' .repeat(70));
}

cleanupOldJournalEntries()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
