import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { db } from '../db/index';
import { vendorBills, vendorBillLines } from '../db/schema/purchasing';
import { eq } from 'drizzle-orm';

interface BillLineRow {
  id: string;
  billId: string;
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  lineNumber: string;
  assetId: string;
  createdAt: string;
}

async function restoreBillLines() {
  console.log('🔄 Starting bill lines restoration...\n');

  // Map old bill IDs to new bill IDs (matched by total amount)
  const billIdMap: Record<number, number> = {
    13: 86,  // 1692900000
    16: null as any, // Bill 16 might not exist in current DB
    17: 87,  // 849750000
    18: 88,  // 236340000
    19: 89,  // 243600000
    20: 90,  // 420000000
    21: 91,  // 80000000
    22: 92,  // 302400000
    23: 93,  // 902500000
    24: 94,  // 812500000
    25: 95,  // 263600000
    26: 96,  // 150000000
    27: 97,  // 228000000
    28: 98,  // 10500000
    29: 99,  // 1748677500
    30: 100, // 1138170000
    31: 101, // 291847500
    32: 102, // 1680750000
    33: 103, // 2500960000
    34: 104, // 607200000
  };

  const records: BillLineRow[] = [];

  // Read CSV file
  const parser = createReadStream('/Users/zafar/Documents/LAZA_next/exports/bill_items.csv')
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      bom: true // Handle UTF-8 BOM
    }));

  for await (const record of parser) {
    records.push(record as BillLineRow);
  }

  console.log(`📋 Found ${records.length} bill line items to restore\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records) {
    try {
      const oldBillId = parseInt(row.billId);
      const newBillId = billIdMap[oldBillId];

      if (!newBillId) {
        console.log(`⚠️  Skipping line for unknown bill ID: ${oldBillId}`);
        skipped++;
        continue;
      }

      // Check if bill exists
      const bill = await db.select().from(vendorBills).where(eq(vendorBills.id, newBillId)).limit(1);
      if (bill.length === 0) {
        console.log(`❌ Bill ${newBillId} not found, skipping line`);
        skipped++;
        continue;
      }

      // Check if line already exists
      const existingLines = await db.select()
        .from(vendorBillLines)
        .where(eq(vendorBillLines.billId, newBillId));

      const lineNumber = parseInt(row.lineNumber) || 0;
      const alreadyExists = existingLines.some(l => l.lineNumber === lineNumber);

      if (alreadyExists) {
        console.log(`⏭️  Line ${lineNumber} for bill ${newBillId} already exists, skipping`);
        skipped++;
        continue;
      }

      // Insert the line
      await db.insert(vendorBillLines).values({
        billId: newBillId,
        itemId: parseInt(row.itemId),
        description: row.description || '',
        quantity: parseInt(row.quantity) || 0,
        unitPrice: parseInt(row.unitPrice) || 0,
        amount: parseInt(row.amount) || 0,
        lineNumber: lineNumber,
        assetId: row.assetId ? parseInt(row.assetId) : null,
      });

      imported++;
      console.log(`✅ Restored line ${lineNumber} for Bill #${newBillId} (${row.description})`);

    } catch (error: any) {
      console.error(`❌ Error processing row:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Restoration Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
}

restoreBillLines()
  .then(() => {
    console.log('\n✨ Bill lines restoration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
