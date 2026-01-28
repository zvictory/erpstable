import { db } from '../db/index';
import { vendorBills, vendorBillLines } from '../db/schema/purchasing';
import { journalEntries, journalEntryLines } from '../db/schema/finance';
import { eq } from 'drizzle-orm';

async function createBillJournalEntries() {
  console.log('🔄 Creating journal entries for all vendor bills...\n');

  // Get all vendor bills
  const bills = await db.select().from(vendorBills).orderBy(vendorBills.id);

  console.log(`📋 Found ${bills.length} bills to process\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const bill of bills) {
    try {
      const transactionId = `bill-${bill.id}`;

      // Check if journal entry already exists
      const existingJE = await db.select()
        .from(journalEntries)
        .where(eq(journalEntries.transactionId, transactionId))
        .limit(1);

      if (existingJE.length > 0 && !existingJE[0].description?.includes('Reversal') && !existingJE[0].description?.includes('Deleted')) {
        console.log(`⏭️  Bill #${bill.id} (${bill.billNumber}) - JE already exists`);
        skipped++;
        continue;
      }

      // Get bill lines to determine inventory amount
      const lines = await db.select()
        .from(vendorBillLines)
        .where(eq(vendorBillLines.billId, bill.id));

      const inventoryAmount = lines.reduce((sum, line) => sum + line.amount, 0);

      // Create journal entry
      const [journalEntry] = await db.insert(journalEntries).values({
        transactionId: transactionId,
        date: bill.billDate,
        description: `Vendor Bill ${bill.billNumber}`,
        isPosted: true,
        entryType: 'TRANSACTION',
      }).returning();

      // Create journal entry lines
      const jeLines = [];

      // Debit: Inventory (Сырье и материалы) - 1310
      if (inventoryAmount > 0) {
        jeLines.push({
          journalEntryId: journalEntry.id,
          accountCode: '1310',
          debit: inventoryAmount,
          credit: 0,
          description: `Inventory from ${bill.billNumber}`,
        });
      }

      // Credit: Accounts Payable (Счета к оплате) - 2100
      jeLines.push({
        journalEntryId: journalEntry.id,
        accountCode: '2100',
        debit: 0,
        credit: bill.totalAmount,
        description: `AP for ${bill.billNumber}`,
      });

      await db.insert(journalEntryLines).values(jeLines);

      created++;
      console.log(`✅ Created JE for Bill #${bill.id} (${bill.billNumber}) - AP: ${(bill.totalAmount/100).toLocaleString()}, Inv: ${(inventoryAmount/100).toLocaleString()}`);

    } catch (error: any) {
      console.error(`❌ Error processing Bill #${bill.id}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 Journal Entry Creation Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(70));

  // Show final balances
  const apBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '2100'));

  const invBalance = await db.select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountCode, '1310'));

  const apTotal = apBalance.reduce((sum, line) => sum + (line.credit - line.debit), 0);
  const invTotal = invBalance.reduce((sum, line) => sum + (line.debit - line.credit), 0);

  console.log('\n📈 Updated Account Balances:');
  console.log(`   2100 (Accounts Payable): ${(apTotal/100).toLocaleString()} (Credit)`);
  console.log(`   1310 (Inventory): ${(invTotal/100).toLocaleString()} (Debit)`);
}

createBillJournalEntries()
  .then(() => {
    console.log('\n✨ Journal entry creation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
