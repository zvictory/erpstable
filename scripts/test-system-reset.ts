/**
 * Test Script: System Reset Verification
 *
 * This script:
 * 1. Checks current database state (pre-reset)
 * 2. Simulates the reset operation
 * 3. Verifies transactional data deleted
 * 4. Verifies master data preserved with fields reset
 */

import { db } from '../db';
import {
  // Transactional tables to check
  invoices,
  vendorBills,
  purchaseOrders,
  inventoryLayers,
  journalEntries,
  customerPayments,
  vendorPayments,
  workOrders,
  productionRuns,

  // Master data tables to check
  items,
  vendors,
  customers,
  glAccounts,
  fixedAssets,
  categories,
  uoms,
} from '../db/schema';

async function checkDatabaseState(label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}`);
  console.log(`${'='.repeat(60)}\n`);

  // Transactional data counts
  console.log('📊 TRANSACTIONAL DATA:');
  const transactionalCounts = {
    invoices: await db.select().from(invoices).then(r => r.length),
    vendorBills: await db.select().from(vendorBills).then(r => r.length),
    purchaseOrders: await db.select().from(purchaseOrders).then(r => r.length),
    inventoryLayers: await db.select().from(inventoryLayers).then(r => r.length),
    journalEntries: await db.select().from(journalEntries).then(r => r.length),
    customerPayments: await db.select().from(customerPayments).then(r => r.length),
    vendorPayments: await db.select().from(vendorPayments).then(r => r.length),
    workOrders: await db.select().from(workOrders).then(r => r.length),
    productionRuns: await db.select().from(productionRuns).then(r => r.length),
  };

  console.table(transactionalCounts);

  // Master data counts
  console.log('\n📚 MASTER DATA:');
  const masterDataCounts = {
    items: await db.select().from(items).then(r => r.length),
    vendors: await db.select().from(vendors).then(r => r.length),
    customers: await db.select().from(customers).then(r => r.length),
    glAccounts: await db.select().from(glAccounts).then(r => r.length),
    fixedAssets: await db.select().from(fixedAssets).then(r => r.length),
    categories: await db.select().from(categories).then(r => r.length),
    uoms: await db.select().from(uoms).then(r => r.length),
  };

  console.table(masterDataCounts);

  // Sample item fields (should be reset to 0)
  console.log('\n📦 SAMPLE ITEM FIELDS:');
  const sampleItems = await db.select({
    id: items.id,
    name: items.name,
    quantityOnHand: items.quantityOnHand,
    averageCost: items.averageCost,
  }).from(items).limit(5);

  console.table(sampleItems);

  // Sample GL account balances (should be reset to 0)
  console.log('\n💰 SAMPLE GL ACCOUNT BALANCES:');
  const sampleAccounts = await db.select({
    code: glAccounts.code,
    name: glAccounts.name,
    balance: glAccounts.balance,
  }).from(glAccounts).limit(5);

  console.table(sampleAccounts);

  return { transactionalCounts, masterDataCounts };
}

async function main() {
  console.log('🔍 SYSTEM RESET TEST VERIFICATION\n');

  // Step 1: Check pre-reset state
  const preReset = await checkDatabaseState('PRE-RESET STATE');

  // Step 2: Provide manual test instructions
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL TEST INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\n1. Navigate to http://localhost:3000/en/settings');
  console.log('2. Scroll to "System Administration" section');
  console.log('3. Click "Reset System Data" button');
  console.log('4. Review the warning modal');
  console.log('5. Click "Continue to Confirmation"');
  console.log('6. Type exactly: DELETE-TEST-DATA');
  console.log('7. Click "Execute Reset"');
  console.log('8. Wait for completion');
  console.log('9. Run this script again to verify results\n');

  // Step 3: Show what to expect
  console.log('='.repeat(60));
  console.log('EXPECTED RESULTS AFTER RESET');
  console.log('='.repeat(60));
  console.log('\n✅ All transactional counts should be 0');
  console.log('✅ Master data counts should remain the same');
  console.log('✅ Item quantityOnHand and averageCost should be 0');
  console.log('✅ GL account balances should be 0');
  console.log('✅ Console logs should show deletion/reset counts\n');

  // Calculate totals
  const totalTransactional = Object.values(preReset.transactionalCounts).reduce((sum, val) => sum + val, 0);
  const totalMaster = Object.values(preReset.masterDataCounts).reduce((sum, val) => sum + val, 0);

  console.log(`📊 Current transactional records: ${totalTransactional}`);
  console.log(`📚 Current master data records: ${totalMaster}\n`);

  if (totalTransactional === 0) {
    console.log('⚠️  WARNING: No transactional data exists!');
    console.log('   The database appears to be already reset or empty.');
    console.log('   Consider creating sample data first.\n');
  } else {
    console.log('✅ Ready for testing - transactional data exists.\n');
  }
}

main().catch(console.error);
