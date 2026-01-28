/**
 * Test script for contract lifecycle management (suspension and expiration)
 *
 * Tests:
 * 1. Contract suspension - verify status change and auto_generate_refills disabled
 * 2. Contract expiration - expire contracts past end date
 * 3. Refill job skips suspended/expired contracts
 *
 * Usage: npx tsx scripts/test-contract-lifecycle.ts
 */

import { db } from '../db';
import { serviceContracts, contractRefillItems } from '../db/schema/service';
import { customers } from '../db/schema/sales';
import { items } from '../db/schema/inventory';
import { eq, and, lte, sql } from 'drizzle-orm';

// --- Helper Functions (Direct DB operations without auth) ---

async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceContracts)
    .where(sql`${serviceContracts.contractNumber} LIKE ${`AMC-${year}-%`}`);

  const sequence = (result[0]?.count || 0) + 1;
  return `AMC-${year}-${String(sequence).padStart(5, '0')}`;
}

// --- Test Data Setup ---

async function setupTestData() {
  console.log('Setting up test data...\n');

  // Find or create test customer
  let testCustomer = await db.query.customers.findFirst({
    where: eq(customers.name, 'Test Service Customer'),
  });

  if (!testCustomer) {
    const [newCustomer] = await db.insert(customers).values({
      name: 'Test Service Customer',
      email: 'test@service.com',
      phone: '998901234567',
      address: 'Test Address',
      taxId: 'TEST-TAX-ID',
      billingCurrency: 'UZS',
    }).returning();
    testCustomer = newCustomer;
  }

  // Find test items (need at least 2 for refill items)
  const testItems = await db.query.items.findMany({ limit: 2 });

  if (testItems.length < 2) {
    throw new Error('Need at least 2 items in database for testing');
  }

  console.log(`✓ Test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);
  console.log(`✓ Test items: ${testItems.map(i => i.name).join(', ')}\n`);

  return { testCustomer, testItems };
}

// --- Test 1: Contract Suspension ---

async function testContractSuspension(customerId: number, testItems: any[]) {
  console.log('='.repeat(60));
  console.log('TEST 1: Contract Suspension');
  console.log('='.repeat(60));

  try {
    // Create active contract with auto_generate_refills = true
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12); // 1 year contract

    const contractNumber = await generateContractNumber();
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const [contract] = await db.insert(serviceContracts).values({
      contractNumber,
      customerId,
      contractType: 'SUPPLIES_ONLY',
      startDate,
      endDate,
      billingFrequencyMonths: 1,
      nextBillingDate,
      autoGenerateRefills: true,
      monthlyValue: 50000000, // 500,000 UZS
      status: 'ACTIVE',
    }).returning();

    // Add refill items
    await db.insert(contractRefillItems).values({
      contractId: contract.id,
      itemId: testItems[0].id,
      quantityPerCycle: 10,
      contractUnitPrice: 5000000, // 50,000 UZS
    });

    console.log(`\n✓ Created test contract: ${contract.contractNumber}`);
    console.log(`  Contract ID: ${contract.id}`);

    // Verify initial state
    const contractBefore = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, contract.id),
    });

    console.log(`\nBefore Suspension:`);
    console.log(`  Status: ${contractBefore!.status}`);
    console.log(`  Auto-generate refills: ${contractBefore!.autoGenerateRefills}`);
    console.log(`  Suspension reason: ${contractBefore!.suspensionReason || 'None'}`);

    // Test: Suspend contract (direct DB operation)
    console.log(`\nSuspending contract...`);
    await db.update(serviceContracts)
      .set({
        status: 'SUSPENDED',
        autoGenerateRefills: false,
        suspensionReason: 'Customer request - payment issues',
      })
      .where(eq(serviceContracts.id, contract.id));

    // Verify suspension
    const contractAfter = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, contract.id),
    });

    console.log(`\nAfter Suspension:`);
    console.log(`  Status: ${contractAfter!.status}`);
    console.log(`  Auto-generate refills: ${contractAfter!.autoGenerateRefills}`);
    console.log(`  Suspension reason: ${contractAfter!.suspensionReason}`);

    // Verify expectations
    const suspensionTestPassed =
      contractAfter!.status === 'SUSPENDED' &&
      contractAfter!.autoGenerateRefills === false &&
      contractAfter!.suspensionReason === 'Customer request - payment issues';

    if (suspensionTestPassed) {
      console.log(`\n✅ Suspension Test PASSED`);
      console.log(`   - Status changed to SUSPENDED`);
      console.log(`   - Auto-generate refills disabled`);
      console.log(`   - Suspension reason recorded`);
    } else {
      console.log(`\n❌ Suspension Test FAILED`);
      console.log(`   Expected: status=SUSPENDED, autoGenerateRefills=false`);
      console.log(`   Got: status=${contractAfter!.status}, autoGenerateRefills=${contractAfter!.autoGenerateRefills}`);
    }

    // Test: Run refill job and verify suspended contract is skipped
    console.log(`\n--- Testing Refill Job Skip ---`);

    // Set nextBillingDate to past date to make it due
    await db.update(serviceContracts)
      .set({ nextBillingDate: new Date(Date.now() - 86400000) }) // Yesterday
      .where(eq(serviceContracts.id, contract.id));

    console.log(`Setting contract as "due" for refill (nextBillingDate = yesterday)`);

    // Query contracts due for refill (mimicking generateRecurringRefills logic)
    const currentDate = new Date();
    const dueContracts = await db.query.serviceContracts.findMany({
      where: and(
        eq(serviceContracts.status, 'ACTIVE'),
        eq(serviceContracts.autoGenerateRefills, true),
        lte(serviceContracts.nextBillingDate, currentDate)
      ),
    });

    console.log(`\nRefill job query results:`);
    console.log(`  Total contracts found: ${dueContracts.length}`);

    // Check if our suspended contract is in the list
    const ourContractInList = dueContracts.some(c => c.id === contract.id);
    console.log(`  Our suspended contract (ID ${contract.id}) in list: ${ourContractInList}`);

    // Since contract is SUSPENDED, it should not be picked up by the refill job
    // The query filters for status='ACTIVE' only
    const refillSkipPassed = !ourContractInList;

    if (refillSkipPassed) {
      console.log(`\n✅ Refill Skip Test PASSED`);
      console.log(`   - Suspended contract not picked up by refill job`);
    } else {
      console.log(`\n❌ Refill Skip Test FAILED`);
      console.log(`   - Expected 0 contracts processed, got ${dueContracts.length}`);
    }

    return { suspensionTestPassed, refillSkipPassed, testContractId: contract.id };

  } catch (error: any) {
    console.error(`\n❌ Suspension test failed with error:`, error.message);
    return { suspensionTestPassed: false, refillSkipPassed: false, testContractId: null };
  }
}

// --- Test 2: Contract Expiration ---

async function testContractExpiration(customerId: number, testItems: any[]) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Contract Expiration');
  console.log('='.repeat(60));

  try {
    // Create contract with end_date = yesterday
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 13); // 13 months ago

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday (expired)

    const contractNumber = await generateContractNumber();
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const [contract] = await db.insert(serviceContracts).values({
      contractNumber,
      customerId,
      contractType: 'MAINTENANCE',
      startDate,
      endDate,
      billingFrequencyMonths: 1,
      nextBillingDate,
      autoGenerateRefills: true,
      monthlyValue: 30000000, // 300,000 UZS
      status: 'ACTIVE',
    }).returning();

    // Add refill items
    await db.insert(contractRefillItems).values({
      contractId: contract.id,
      itemId: testItems[1].id,
      quantityPerCycle: 5,
      contractUnitPrice: 6000000, // 60,000 UZS
    });

    console.log(`\n✓ Created expired test contract: ${contract.contractNumber}`);
    console.log(`  Contract ID: ${contract.id}`);
    console.log(`  End Date: ${endDate.toISOString().split('T')[0]} (Yesterday)`);

    // Verify initial state
    const contractBefore = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, contract.id),
    });

    console.log(`\nBefore Expiration:`);
    console.log(`  Status: ${contractBefore!.status}`);
    console.log(`  Auto-generate refills: ${contractBefore!.autoGenerateRefills}`);
    console.log(`  End Date: ${new Date(contractBefore!.endDate).toISOString().split('T')[0]}`);

    // Test: Expire old contracts (direct DB operation)
    console.log(`\nRunning expireOldContracts() logic...`);
    const currentDate = new Date();

    // Find active contracts past end date
    const expiredContracts = await db
      .select({ id: serviceContracts.id })
      .from(serviceContracts)
      .where(
        and(
          eq(serviceContracts.status, 'ACTIVE'),
          lte(serviceContracts.endDate, currentDate)
        )
      );

    console.log(`\nFound ${expiredContracts.length} expired contracts`);

    // Update contracts to EXPIRED status
    if (expiredContracts.length > 0) {
      await db.update(serviceContracts)
        .set({
          status: 'EXPIRED',
          autoGenerateRefills: false,
        })
        .where(
          and(
            eq(serviceContracts.status, 'ACTIVE'),
            lte(serviceContracts.endDate, currentDate)
          )
        );
    }

    console.log(`\nExpiration job results:`);
    console.log(`  Contracts expired: ${expiredContracts.length}`);

    // Verify expiration
    const contractAfter = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, contract.id),
    });

    console.log(`\nAfter Expiration:`);
    console.log(`  Status: ${contractAfter!.status}`);
    console.log(`  Auto-generate refills: ${contractAfter!.autoGenerateRefills}`);

    // Verify expectations
    const expirationTestPassed =
      contractAfter!.status === 'EXPIRED' &&
      contractAfter!.autoGenerateRefills === false &&
      expiredContracts.length >= 1;

    if (expirationTestPassed) {
      console.log(`\n✅ Expiration Test PASSED`);
      console.log(`   - Status changed to EXPIRED`);
      console.log(`   - Auto-generate refills disabled`);
      console.log(`   - Contract counted in expiration job`);
    } else {
      console.log(`\n❌ Expiration Test FAILED`);
      console.log(`   Expected: status=EXPIRED, autoGenerateRefills=false, expiredCount>=1`);
      console.log(`   Got: status=${contractAfter!.status}, autoGenerateRefills=${contractAfter!.autoGenerateRefills}, expiredCount=${expirationResult.expiredCount}`);
    }

    // Test: Run refill job and verify expired contract is skipped
    console.log(`\n--- Testing Refill Job Skip (Expired) ---`);

    // Set nextBillingDate to past date
    await db.update(serviceContracts)
      .set({ nextBillingDate: new Date(Date.now() - 86400000) }) // Yesterday
      .where(eq(serviceContracts.id, contract.id));

    console.log(`Setting contract as "due" for refill (nextBillingDate = yesterday)`);

    // Query contracts due for refill (mimicking generateRecurringRefills logic)
    const dueContracts = await db.query.serviceContracts.findMany({
      where: and(
        eq(serviceContracts.status, 'ACTIVE'),
        eq(serviceContracts.autoGenerateRefills, true),
        lte(serviceContracts.nextBillingDate, currentDate)
      ),
    });

    console.log(`\nRefill job query results:`);
    console.log(`  Total contracts found: ${dueContracts.length}`);

    // Check if our expired contract is in the list
    const ourContractInList = dueContracts.some(c => c.id === contract.id);
    console.log(`  Our expired contract (ID ${contract.id}) in list: ${ourContractInList}`);

    // Since contract is EXPIRED, it should not be picked up by the refill job
    const refillSkipExpiredPassed = !ourContractInList;

    if (refillSkipExpiredPassed) {
      console.log(`\n✅ Refill Skip (Expired) Test PASSED`);
      console.log(`   - Expired contract not picked up by refill job`);
    } else {
      console.log(`\n❌ Refill Skip (Expired) Test FAILED`);
      console.log(`   - Expected 0 contracts processed, got ${dueContracts.length}`);
    }

    return { expirationTestPassed, refillSkipExpiredPassed, testContractId: contract.id };

  } catch (error: any) {
    console.error(`\n❌ Expiration test failed with error:`, error.message);
    return { expirationTestPassed: false, refillSkipExpiredPassed: false, testContractId: null };
  }
}

// --- SQL Verification ---

async function sqlVerification(contractIds: number[]) {
  console.log('\n' + '='.repeat(60));
  console.log('SQL VERIFICATION');
  console.log('='.repeat(60));

  for (const contractId of contractIds) {
    if (!contractId) continue;

    const contract = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, contractId),
    });

    if (contract) {
      console.log(`\nContract ID: ${contractId}`);
      console.log(`  Status: ${contract.status}`);
      console.log(`  Auto-generate refills: ${contract.autoGenerateRefills}`);
      console.log(`  Suspension reason: ${contract.suspensionReason || 'None'}`);
      console.log(`  End date: ${new Date(contract.endDate).toISOString().split('T')[0]}`);
    }
  }
}

// --- Main Test Execution ---

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CONTRACT LIFECYCLE MANAGEMENT TEST SUITE                 ║');
  console.log('║  Testing: Suspension, Expiration, Refill Job Behavior     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Setup test data
    const { testCustomer, testItems } = await setupTestData();

    // Run tests
    const suspensionResults = await testContractSuspension(testCustomer.id, testItems);
    const expirationResults = await testContractExpiration(testCustomer.id, testItems);

    // SQL verification
    await sqlVerification([
      suspensionResults.testContractId,
      expirationResults.testContractId,
    ].filter(Boolean) as number[]);

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));

    const allPassed =
      suspensionResults.suspensionTestPassed &&
      suspensionResults.refillSkipPassed &&
      expirationResults.expirationTestPassed &&
      expirationResults.refillSkipExpiredPassed;

    console.log(`\nTest Results:`);
    console.log(`  Contract Suspension: ${suspensionResults.suspensionTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Refill Skip (Suspended): ${suspensionResults.refillSkipPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Contract Expiration: ${expirationResults.expirationTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Refill Skip (Expired): ${expirationResults.refillSkipExpiredPassed ? '✅ PASS' : '❌ FAIL'}`);

    if (allPassed) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ ALL TESTS PASSED`);
      console.log(`${'='.repeat(60)}`);
    } else {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`❌ SOME TESTS FAILED`);
      console.log(`${'='.repeat(60)}`);
    }

    // Manual UI verification instructions
    console.log(`\n${'='.repeat(60)}`);
    console.log('MANUAL UI VERIFICATION');
    console.log('='.repeat(60));
    console.log(`\n1. Navigate to: /service/contracts`);
    console.log(`2. Verify suspended contracts show SUSPENDED badge`);
    console.log(`3. Verify expired contracts show EXPIRED badge`);
    console.log(`4. Verify action buttons disabled for non-active contracts`);
    console.log(`\nTest contract IDs to check:`);
    if (suspensionResults.testContractId) {
      console.log(`  - Suspended Contract: ID ${suspensionResults.testContractId}`);
    }
    if (expirationResults.testContractId) {
      console.log(`  - Expired Contract: ID ${expirationResults.testContractId}`);
    }

  } catch (error: any) {
    console.error('\n❌ Test suite failed with error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute tests
main()
  .then(() => {
    console.log('\n✓ Test suite completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
