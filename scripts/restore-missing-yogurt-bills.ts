import { db } from '../db/index';
import { vendorBills, vendorBillLines, vendors } from '../db/schema/purchasing';
import { eq } from 'drizzle-orm';

async function restoreMissingBills() {
  console.log('🔄 Restoring missing yogurt vendor bills...\n');

  // Find the yogurt vendor
  const yogurtVendor = await db.select()
    .from(vendors)
    .where(eq(vendors.name, 'Доброе деревенское утро (йогурт)!'))
    .limit(1);

  if (yogurtVendor.length === 0) {
    console.error('❌ Yogurt vendor not found!');
    process.exit(1);
  }

  const vendorId = yogurtVendor[0].id;
  console.log(`✅ Found vendor: ${yogurtVendor[0].name} (ID: ${vendorId})\n`);

  // Bill #14: 500,000 tiyin, dated 2026-01-14, no items
  console.log('📋 Creating Bill #14...');
  const bill14Result = await db.insert(vendorBills).values({
    vendorId: vendorId,
    billDate: new Date('2026-01-14'),
    billNumber: 'BILL-14',
    totalAmount: 500000,
    status: 'OPEN',
  }).returning();

  const bill14Id = bill14Result[0].id;
  console.log(`   ✅ Created Bill #14 with ID: ${bill14Id}\n`);

  // Bill #16: 411,355,000 tiyin, dated 2025-12-01, with Yogurt item
  console.log('📋 Creating Bill #16...');
  const bill16Result = await db.insert(vendorBills).values({
    vendorId: vendorId,
    billDate: new Date('2025-12-01'),
    billNumber: 'BILL-16',
    totalAmount: 411355000,
    status: 'OPEN',
  }).returning();

  const bill16Id = bill16Result[0].id;
  console.log(`   ✅ Created Bill #16 with ID: ${bill16Id}`);

  // Add line item for Bill #16 - Yogurt
  // From export: itemId=6, qty=127.75, unitPrice=3220000, amount=411355000
  console.log('   📝 Adding Yogurt line item to Bill #16...');
  await db.insert(vendorBillLines).values({
    billId: bill16Id,
    itemId: 6, // Йогурт
    description: 'Йогурт',
    quantity: 12775, // Store 127.75 as 12775 (using integer representation)
    unitPrice: 3220000,
    amount: 411355000,
    lineNumber: 1,
  });
  console.log('   ✅ Line item added\n');

  console.log('=' .repeat(60));
  console.log('✨ Successfully restored missing bills!');
  console.log(`   Bill #14: ${bill14Id} - 500,000 tiyin`);
  console.log(`   Bill #16: ${bill16Id} - 411,355,000 tiyin (with Yogurt)`);
  console.log('=' .repeat(60));
}

restoreMissingBills()
  .then(() => {
    console.log('\n✅ Restoration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
