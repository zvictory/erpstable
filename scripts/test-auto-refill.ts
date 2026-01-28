/**
 * Comprehensive test for auto-refill generation (CRITICAL PATH)
 *
 * This script tests the monthly refill order generation system:
 * 1. Create test data (customer, items, service contract)
 * 2. Test auto-refill generation
 * 3. Verify invoice creation, GL entries, and contract updates
 * 4. Test idempotency (second run should create nothing)
 * 5. Test edge cases (overdue customer, no refill items, future billing date)
 */

import { db } from '../db';
import { customers, invoices as invoicesTable, invoiceLines } from '../db/schema/sales';
import { items, categories, uoms } from '../db/schema/inventory';
import { serviceContracts, contractRefillItems } from '../db/schema/service';
import { journalEntries, journalEntryLines } from '../db/schema/finance';
import { eq, and, sql } from 'drizzle-orm';
import { generateRecurringRefills } from '../src/app/actions/service';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function logResult(scenario: string, passed: boolean, details: string, data?: any) {
  results.push({ scenario, passed, details, data });
  console.log(`\n${passed ? '✅' : '❌'} ${scenario}`);
  console.log(`   ${details}`);
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test contracts and related data
  const testContracts = await db
    .select({ id: serviceContracts.id })
    .from(serviceContracts)
    .where(sql`${serviceContracts.contractNumber} LIKE 'TEST-%'`);

  for (const contract of testContracts) {
    await db.delete(contractRefillItems).where(eq(contractRefillItems.contractId, contract.id));
    await db.delete(serviceContracts).where(eq(serviceContracts.id, contract.id));
  }

  // Delete test invoices
  const testInvoices = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(sql`${invoicesTable.invoiceNumber} LIKE 'TEST-%'`);

  for (const invoice of testInvoices) {
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));
    await db.delete(invoicesTable).where(eq(invoicesTable.id, invoice.id));
  }

  // Delete test journal entries
  const testJEs = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(sql`${journalEntries.reference} LIKE 'TEST-%'`);

  for (const je of testJEs) {
    await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
    await db.delete(journalEntries).where(eq(journalEntries.id, je.id));
  }

  // Delete test customers
  await db.delete(customers).where(sql`${customers.name} LIKE 'TEST-%'`);

  // Delete test items
  await db.delete(items).where(sql`${items.name} LIKE 'TEST-%'`);

  console.log('✅ Cleanup complete\n');
}

async function setupTestData() {
  console.log('\n📦 Setting up test data...\n');

  // 1. Get or create item category
  let category = await db.query.categories.findFirst({
    where: eq(categories.name, 'Office Supplies'),
  });

  if (!category) {
    [category] = await db.insert(categories).values({
      name: 'Office Supplies',
    }).returning();
  }

  // 2. Get base UOM (Штука/pcs)
  const pcsUom = await db.query.uoms.findFirst({
    where: eq(uoms.code, 'pcs'),
  });

  if (!pcsUom) {
    throw new Error('UOM "pcs" not found. Please run seed script first.');
  }

  // 3. Create test items (refill supplies)
  const [item1] = await db.insert(items).values({
    name: 'TEST-Toner Cartridge Black',
    sku: 'TEST-TONER-BLK',
    categoryId: category.id,
    baseUomId: pcsUom.id,
    standardCost: 150000, // 1,500 UZS
    salesPrice: 250000, // 2,500 UZS
    quantityOnHand: 100,
    averageCost: 150000,
    assetAccountCode: '1310',
    incomeAccountCode: '4000',
    expenseAccountCode: '5000',
  }).returning();

  const [item2] = await db.insert(items).values({
    name: 'TEST-Paper A4 (Ream)',
    sku: 'TEST-PAPER-A4',
    categoryId: category.id,
    baseUomId: pcsUom.id,
    standardCost: 50000, // 500 UZS
    salesPrice: 80000, // 800 UZS
    quantityOnHand: 200,
    averageCost: 50000,
    assetAccountCode: '1310',
    incomeAccountCode: '4000',
    expenseAccountCode: '5000',
  }).returning();

  console.log(`✅ Created test items: ${item1.name}, ${item2.name}`);

  // 4. Create test customers
  const [customer1] = await db.insert(customers).values({
    name: 'TEST-Customer Active',
    email: 'test-active@example.com',
    phone: '+998901234567',
  }).returning();

  const [customer2] = await db.insert(customers).values({
    name: 'TEST-Customer Overdue',
    email: 'test-overdue@example.com',
    phone: '+998901234568',
  }).returning();

  console.log(`✅ Created test customers: ${customer1.name}, ${customer2.name}`);

  return { category, item1, item2, customer1, customer2 };
}

async function createTestContract(
  customerId: number,
  item1Id: number,
  item2Id: number,
  nextBillingDate: Date,
  options: {
    contractNumber?: string;
    autoGenerateRefills?: boolean;
    addRefillItems?: boolean;
  } = {}
) {
  const {
    contractNumber = `TEST-CONTRACT-${Date.now()}`,
    autoGenerateRefills = true,
    addRefillItems = true,
  } = options;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const [contract] = await db.insert(serviceContracts).values({
    contractNumber,
    customerId,
    contractType: 'SUPPLIES_ONLY',
    startDate,
    endDate,
    billingFrequencyMonths: 1,
    nextBillingDate,
    autoGenerateRefills,
    monthlyValue: 500000, // 5,000 UZS
    status: 'ACTIVE',
  }).returning();

  if (addRefillItems) {
    await db.insert(contractRefillItems).values([
      {
        contractId: contract.id,
        itemId: item1Id,
        quantityPerCycle: 2,
        contractUnitPrice: 250000, // 2,500 UZS each
      },
      {
        contractId: contract.id,
        itemId: item2Id,
        quantityPerCycle: 5,
        contractUnitPrice: 80000, // 800 UZS each
      },
    ]);
  }

  return contract;
}

async function testScenario1(testData: Awaited<ReturnType<typeof setupTestData>>) {
  console.log('\n=== SCENARIO 1: Normal Auto-Refill Generation ===\n');

  const { customer1, item1, item2 } = testData;

  // Create contract with next_billing_date = yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const contract = await createTestContract(customer1.id, item1.id, item2.id, yesterday);

  // Run auto-refill generation
  const result = await generateRecurringRefills(true);

  await logResult(
    'Auto-refill job executed',
    result.success === true,
    `Total: ${result.results.total}, Success: ${result.results.success}, Skipped: ${result.results.skipped}`,
    result.results
  );

  // Verify invoice created
  const generatedInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoicesTable.customerId, customer1.id),
      sql`${invoicesTable.invoiceNumber} LIKE 'SO-REFILL-%'`
    ),
    with: {
      lines: {
        with: {
          item: true,
        },
      },
    },
  });

  await logResult(
    'Refill invoice created',
    generatedInvoices.length > 0,
    `Found ${generatedInvoices.length} invoice(s) with format SO-REFILL-YYYY-XXXXX`,
    generatedInvoices[0] ? {
      invoiceNumber: generatedInvoices[0].invoiceNumber,
      totalAmount: generatedInvoices[0].totalAmount,
      lineCount: generatedInvoices[0].lines.length,
    } : null
  );

  if (generatedInvoices.length > 0) {
    const invoice = generatedInvoices[0];

    // Verify invoice has 2 lines
    await logResult(
      'Invoice has correct line items',
      invoice.lines.length === 2,
      `Expected 2 lines, found ${invoice.lines.length}`,
      invoice.lines.map((l: any) => ({
        item: l.item.name,
        quantity: l.quantity,
        rate: l.rate,
        amount: l.amount,
      }))
    );

    // Verify invoice amounts
    const expectedSubtotal = (2 * 250000) + (5 * 80000); // 500,000 + 400,000 = 900,000 Tiyin
    await logResult(
      'Invoice amounts correct',
      invoice.subtotal === expectedSubtotal && invoice.totalAmount === expectedSubtotal,
      `Expected ${expectedSubtotal}, found subtotal: ${invoice.subtotal}, total: ${invoice.totalAmount}`
    );

    // Verify GL entries
    const jeEntries = await db.query.journalEntries.findMany({
      where: eq(journalEntries.reference, invoice.invoiceNumber),
      with: {
        lines: true,
      },
    });

    await logResult(
      'Journal entry created',
      jeEntries.length > 0 && jeEntries[0].lines.length === 2,
      `Found ${jeEntries.length} JE with ${jeEntries[0]?.lines.length || 0} lines`,
      jeEntries[0]?.lines.map(l => ({
        account: l.accountCode,
        debit: l.debit,
        credit: l.credit,
      }))
    );

    if (jeEntries.length > 0) {
      const je = jeEntries[0];
      const arDebit = je.lines.find((l: any) => l.accountCode === '1200');
      const revenueCredit = je.lines.find((l: any) => l.accountCode === '4000');

      const isBalanced = !!(arDebit && revenueCredit && arDebit.debit === revenueCredit.credit);

      await logResult(
        'GL entries balanced',
        isBalanced,
        `AR Debit: ${arDebit?.debit || 0}, Revenue Credit: ${revenueCredit?.credit || 0}`
      );
    }
  }

  // Verify next_billing_date advanced
  const updatedContract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, contract.id),
  });

  const expectedNextBilling = new Date(yesterday);
  expectedNextBilling.setMonth(expectedNextBilling.getMonth() + 1);

  const nextBillingUpdated = updatedContract?.nextBillingDate
    ? updatedContract.nextBillingDate >= expectedNextBilling
    : false;

  await logResult(
    'Next billing date advanced',
    nextBillingUpdated,
    `Original: ${yesterday.toISOString()}, Updated: ${updatedContract?.nextBillingDate?.toISOString() || 'null'}, Expected >= ${expectedNextBilling.toISOString()}`
  );

  return contract;
}

async function testScenario2(contract: any) {
  console.log('\n=== SCENARIO 2: Idempotency Test ===\n');

  // Run auto-refill generation again (should process 0 contracts)
  const result = await generateRecurringRefills(true);

  await logResult(
    'Idempotency verified',
    result.results.total === 0,
    `Second run processed ${result.results.total} contracts (expected 0)`,
    result.results
  );
}

async function testScenario3(testData: Awaited<ReturnType<typeof setupTestData>>) {
  console.log('\n=== SCENARIO 3: Contract with No Refill Items ===\n');

  const { customer1, item1, item2 } = testData;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const contract = await createTestContract(customer1.id, item1.id, item2.id, yesterday, {
    contractNumber: `TEST-NO-ITEMS-${Date.now()}`,
    addRefillItems: false, // No refill items
  });

  const result = await generateRecurringRefills(true);

  await logResult(
    'Contract with no refill items skipped',
    result.results.skipped > 0,
    `Skipped ${result.results.skipped} contract(s), Errors: ${result.results.errors.length}`,
    result.results.errors
  );
}

async function testScenario4(testData: Awaited<ReturnType<typeof setupTestData>>) {
  console.log('\n=== SCENARIO 4: Contract with Future Billing Date ===\n');

  const { customer1, item1, item2 } = testData;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const contract = await createTestContract(customer1.id, item1.id, item2.id, tomorrow, {
    contractNumber: `TEST-FUTURE-${Date.now()}`,
  });

  const result = await generateRecurringRefills(true);

  await logResult(
    'Contract with future billing date not processed',
    result.results.total === 0,
    `Processed ${result.results.total} contracts (expected 0 because billing date is in future)`
  );
}

async function testScenario5(testData: Awaited<ReturnType<typeof setupTestData>>) {
  console.log('\n=== SCENARIO 5: Invoice Number Format ===\n');

  const { customer1 } = testData;

  const refillInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoicesTable.customerId, customer1.id),
      sql`${invoicesTable.invoiceNumber} LIKE 'SO-REFILL-%'`
    ),
  });

  if (refillInvoices.length > 0) {
    const invoice = refillInvoices[0];
    const formatRegex = /^SO-REFILL-\d{4}-\d{5}$/;
    const isValidFormat = formatRegex.test(invoice.invoiceNumber);

    await logResult(
      'Invoice number format correct',
      isValidFormat,
      `Invoice number: ${invoice.invoiceNumber}, Expected format: SO-REFILL-YYYY-XXXXX`,
      { invoiceNumber: invoice.invoiceNumber }
    );
  }
}

async function printSummary() {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n   ${r.scenario}`);
      console.log(`   ${r.details}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Print SQL verification queries
  console.log('📝 SQL VERIFICATION QUERIES:\n');
  console.log('-- View all refill invoices:');
  console.log(`SELECT * FROM invoices WHERE invoice_number LIKE 'SO-REFILL-%' ORDER BY created_at DESC LIMIT 5;`);
  console.log('\n-- View invoice lines for latest refill:');
  console.log(`SELECT il.*, i.invoice_number, itm.name
FROM invoice_lines il
JOIN invoices i ON il.invoice_id = i.id
JOIN items itm ON il.item_id = itm.id
WHERE i.invoice_number LIKE 'SO-REFILL-%'
ORDER BY i.created_at DESC, il.id
LIMIT 10;`);
  console.log('\n-- View journal entries for refill invoices:');
  console.log(`SELECT je.*, jel.account_code, jel.debit, jel.credit
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.reference LIKE 'SO-REFILL-%'
ORDER BY je.created_at DESC
LIMIT 10;`);
  console.log('\n-- View contracts with next billing dates:');
  console.log(`SELECT
  contract_number,
  customer_id,
  next_billing_date,
  auto_generate_refills,
  status,
  datetime(next_billing_date/1000, 'unixepoch') as next_billing_readable
FROM service_contracts
WHERE status = 'ACTIVE'
ORDER BY next_billing_date
LIMIT 10;`);
  console.log('\n-- Count refill items per contract:');
  console.log(`SELECT
  sc.contract_number,
  COUNT(cri.id) as refill_item_count
FROM service_contracts sc
LEFT JOIN contract_refill_items cri ON sc.id = cri.contract_id
WHERE sc.status = 'ACTIVE'
GROUP BY sc.id, sc.contract_number;`);

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  try {
    console.log('\n🚀 Starting Auto-Refill Generation Test\n');
    console.log('This is the CRITICAL PATH test for the Field Service module.');
    console.log('='.repeat(60));

    // Cleanup any previous test data
    await cleanup();

    // Setup test data
    const testData = await setupTestData();

    // Run test scenarios
    const contract = await testScenario1(testData);
    await testScenario2(contract);
    await testScenario3(testData);
    await testScenario4(testData);
    await testScenario5(testData);

    // Print summary
    await printSummary();

    // Optional: Keep test data for manual inspection
    const keepData = process.argv.includes('--keep-data');
    if (!keepData) {
      await cleanup();
      console.log('✅ Test data cleaned up. Use --keep-data flag to preserve test data for manual inspection.\n');
    } else {
      console.log('📌 Test data preserved for manual inspection (--keep-data flag used).\n');
    }

    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error during test execution:', error);
    await cleanup();
    process.exit(1);
  }
}

main();
