/**
 * Verification script to check vendor information in AP account 2100
 */

import { db } from '../db';
import { journalEntries, journalEntryLines, vendorBills, vendors } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

async function verifyVendorDisplay() {
  console.log('🔍 Checking vendor information for AP Account 2100...\n');

  // Get all journal entry lines for account 2100
  const lines = await db
    .select({
      line: journalEntryLines,
      journalEntry: journalEntries
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(eq(journalEntryLines.accountCode, '2100'))
    .limit(10);

  console.log(`Found ${lines.length} transactions in account 2100\n`);

  if (lines.length === 0) {
    console.log('⚠️  No transactions found in account 2100');
    return;
  }

  // Extract bill IDs from transactionId
  const billTransactionIds = lines
    .map(l => l.journalEntry.transactionId)
    .filter(tid => tid?.startsWith('bill-'))
    .map(tid => parseInt(tid!.replace('bill-', '').split('-')[0]));

  console.log(`Bill-linked transactions: ${billTransactionIds.length}`);
  console.log(`Bill IDs: ${billTransactionIds.join(', ')}\n`);

  // Fetch vendor information
  if (billTransactionIds.length > 0) {
    const billsWithVendors = await db.select({
      bill: vendorBills,
      vendor: vendors
    })
    .from(vendorBills)
    .innerJoin(vendors, eq(vendorBills.vendorId, vendors.id))
    .where(inArray(vendorBills.id, billTransactionIds));

    const vendorMap = new Map();
    billsWithVendors.forEach(({ bill, vendor }) => {
      vendorMap.set(bill.id, {
        vendorId: vendor.id,
        vendorName: vendor.name
      });
    });

    console.log('Vendor mapping:');
    billsWithVendors.forEach(({ bill, vendor }) => {
      console.log(`  Bill ${bill.id} (${bill.billNumber}) → Vendor "${vendor.name}" (ID: ${vendor.id})`);
    });
    console.log();
  }

  // Display transaction details
  console.log('Transaction Details:\n');
  console.log('─'.repeat(100));

  for (const { line, journalEntry } of lines) {
    const transactionId = journalEntry.transactionId;
    let vendorInfo = null;

    if (transactionId?.startsWith('bill-')) {
      const billId = parseInt(transactionId.replace('bill-', '').split('-')[0]);

      // Try to fetch vendor
      const billWithVendor = await db.select({
        bill: vendorBills,
        vendor: vendors
      })
      .from(vendorBills)
      .innerJoin(vendors, eq(vendorBills.vendorId, vendors.id))
      .where(eq(vendorBills.id, billId))
      .limit(1);

      if (billWithVendor.length > 0) {
        vendorInfo = {
          vendorId: billWithVendor[0].vendor.id,
          vendorName: billWithVendor[0].vendor.name
        };
      }
    }

    console.log(`Date: ${journalEntry.date}`);
    console.log(`Reference: ${journalEntry.reference || 'N/A'}`);
    console.log(`Transaction ID: ${transactionId || 'N/A'}`);
    console.log(`Description: ${line.description || journalEntry.description}`);
    console.log(`Debit: ${line.debit}, Credit: ${line.credit}`);
    console.log(`Vendor: ${vendorInfo ? `${vendorInfo.vendorName} (ID: ${vendorInfo.vendorId})` : '❌ NOT FOUND'}`);
    console.log('─'.repeat(100));
  }

  console.log('\n✅ Verification complete');
  console.log('\nConclusion:');
  console.log('  • If vendors show "NOT FOUND", there\'s a data issue');
  console.log('  • If vendors are present, the display should be working in the UI');
}

verifyVendorDisplay()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
