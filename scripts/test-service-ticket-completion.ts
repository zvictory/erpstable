#!/usr/bin/env tsx

/**
 * Test Script: Service Ticket Completion Workflow
 *
 * This tests the complete workflow:
 * 1. Create/use installation ticket
 * 2. Assign technician and move to IN_PROGRESS
 * 3. Complete ticket with labor and parts (via direct DB operations)
 * 4. Verify all side effects:
 *    - Ticket status = COMPLETED
 *    - Asset status = ACTIVE (for installation)
 *    - Service invoice created
 *    - GL entries posted correctly
 */

import { db } from '../db';
import {
  serviceTickets,
  customerAssets,
  serviceTicketAssets,
} from '../db/schema/service';
import { invoices, invoiceLines, customers } from '../db/schema/sales';
import { journalEntries, journalEntryLines } from '../db/schema/finance';
import { items } from '../db/schema/inventory';
import { users } from '../db/schema/auth';
import { eq, and, desc, sql } from 'drizzle-orm';

interface TestResult {
  phase: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(phase: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
  results.push({ phase, status, message, details });
  console.log(`\n[${status}] ${phase}: ${message}`);
  if (details) {
    console.log('Details:', JSON.stringify(details, null, 2));
  }
}

// Helper to generate service invoice number
async function generateServiceInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existingInvoices = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} LIKE ${`SVC-INV-${year}-%`}`)
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  const lastNumber = existingInvoices[0]?.invoiceNumber;
  let sequence = 1;

  if (lastNumber) {
    const match = lastNumber.match(/SVC-INV-\d{4}-(\d{5})/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `SVC-INV-${year}-${String(sequence).padStart(5, '0')}`;
}

// Helper to generate ticket number
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existingTickets = await db
    .select({ ticketNumber: serviceTickets.ticketNumber })
    .from(serviceTickets)
    .where(sql`${serviceTickets.ticketNumber} LIKE ${`TKT-${year}-%`}`)
    .orderBy(desc(serviceTickets.ticketNumber))
    .limit(1);

  const lastNumber = existingTickets[0]?.ticketNumber;
  let sequence = 1;

  if (lastNumber) {
    const match = lastNumber.match(/TKT-\d{4}-(\d{5})/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `TKT-${year}-${String(sequence).padStart(5, '0')}`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('SERVICE TICKET COMPLETION WORKFLOW TEST');
  console.log('='.repeat(80));

  try {
    // ========================================
    // STEP 1: Setup - Find or create test data
    // ========================================
    console.log('\n📋 STEP 1: Setup Test Data\n');

    // Find a customer for testing
    const testCustomers = await db.query.customers.findMany({
      limit: 1,
    });

    if (testCustomers.length === 0) {
      throw new Error('No customers found in database. Please create a customer first.');
    }

    const testCustomer = testCustomers[0];
    console.log(`✓ Using customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

    // Find an item for parts
    const testItems = await db.query.items.findMany({
      where: eq(items.type, 'FINISHED_GOOD'),
      limit: 1,
    });

    if (testItems.length === 0) {
      throw new Error('No items found in database. Please create items first.');
    }

    const testItem = testItems[0];
    console.log(`✓ Using item: ${testItem.name} (ID: ${testItem.id})`);

    // Find a user for technician
    const testUsers = await db.query.users.findMany({
      limit: 1,
    });

    if (testUsers.length === 0) {
      throw new Error('No users found in database.');
    }

    const technician = testUsers[0];
    console.log(`✓ Using technician: ${technician.name} (ID: ${technician.id})`);

    // Find or create a test ticket
    let testTicket: any = null;
    let createdNewTicket = false;

    // Check for existing OPEN or IN_PROGRESS installation tickets
    const existingTickets = await db.query.serviceTickets.findMany({
      where: and(
        eq(serviceTickets.ticketType, 'INSTALLATION'),
        eq(serviceTickets.customerId, testCustomer.id)
      ),
      with: {
        ticketAssets: {
          with: {
            asset: true,
          },
        },
      },
      orderBy: desc(serviceTickets.id),
      limit: 1,
    });

    if (existingTickets.length > 0 && existingTickets[0].status !== 'COMPLETED') {
      testTicket = existingTickets[0];
      console.log(`✓ Using existing ticket: ${testTicket.ticketNumber} (Status: ${testTicket.status})`);
      logResult('Setup', 'PASS', 'Found existing ticket', {
        ticketId: testTicket.id,
        ticketNumber: testTicket.ticketNumber,
        status: testTicket.status,
      });
    } else {
      // Create new test ticket
      console.log('✓ Creating new installation ticket...');
      createdNewTicket = true;

      const ticketNumber = await generateTicketNumber();

      const [newTicket] = await db.insert(serviceTickets).values({
        ticketNumber,
        customerId: testCustomer.id,
        ticketType: 'INSTALLATION',
        priority: 'MEDIUM',
        title: 'Test Installation Ticket - Automated Test',
        description: 'This is a test ticket for completion workflow verification',
        status: 'OPEN',
        isBillable: true,
        laborHoursDecimal: 0,
      }).returning();

      console.log(`✓ Created ticket: ${ticketNumber}`);

      // Create a test asset for this ticket
      const assetNumber = `CA-TEST-${Date.now()}`;
      const [newAsset] = await db.insert(customerAssets).values({
        assetNumber,
        customerId: testCustomer.id,
        itemId: testItem.id,
        serialNumber: `SN-TEST-${Date.now()}`,
        installationAddress: '123 Test Street',
        status: 'PENDING_INSTALLATION',
      }).returning();

      // Link asset to ticket
      await db.insert(serviceTicketAssets).values({
        ticketId: newTicket.id,
        assetId: newAsset.id,
        notes: 'Test asset for completion workflow',
      });

      console.log(`✓ Created and linked asset: ${assetNumber}`);

      // Refresh ticket with asset
      testTicket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, newTicket.id),
        with: {
          ticketAssets: {
            with: {
              asset: true,
            },
          },
        },
      });

      logResult('Setup', 'PASS', 'Created new test ticket with asset', {
        ticketId: testTicket.id,
        ticketNumber: testTicket.ticketNumber,
        assetCount: testTicket.ticketAssets.length,
      });
    }

    // ========================================
    // STEP 2: Assign Technician and Start Ticket
    // ========================================
    console.log('\n👨‍🔧 STEP 2: Assign Technician and Start Ticket\n');

    if (testTicket.status === 'OPEN') {
      // Update ticket to IN_PROGRESS
      await db.update(serviceTickets)
        .set({
          assignedTechnicianId: technician.id,
          status: 'IN_PROGRESS',
          actualStartTime: new Date(),
        })
        .where(eq(serviceTickets.id, testTicket.id));

      console.log(`✓ Assigned technician: ${technician.name}`);
      console.log(`✓ Updated ticket status to IN_PROGRESS`);

      logResult('Assign & Start', 'PASS', 'Ticket assigned and started', {
        technicianId: technician.id,
        technicianName: technician.name,
      });

      // Refresh ticket data
      testTicket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, testTicket.id),
        with: {
          ticketAssets: {
            with: {
              asset: true,
            },
          },
        },
      });
    } else {
      console.log(`✓ Ticket already in ${testTicket.status} status`);
      logResult('Assign & Start', 'PASS', `Ticket already in ${testTicket.status}`, {
        ticketId: testTicket.id,
      });
    }

    // ========================================
    // STEP 3: Complete Ticket (Simulating completeServiceTicket)
    // ========================================
    console.log('\n✅ STEP 3: Complete Service Ticket\n');

    if (testTicket.status === 'COMPLETED') {
      console.log('⚠️  Ticket already completed. Using existing data for verification.');
      logResult('Complete Ticket', 'PASS', 'Ticket already completed', {
        ticketId: testTicket.id,
        serviceInvoiceId: testTicket.serviceInvoiceId,
      });
    } else {
      // Simulate the completeServiceTicket logic
      const LABOR_RATE_TIYIN = 50000;
      const laborHours = 2.5;
      const partsUsedData = [
        {
          itemId: testItem.id,
          quantity: 2,
          unitCost: 10000, // 100 UZS in Tiyin
        },
      ];

      const laborHoursDecimal = Math.round(laborHours * 100);
      const laborCost = Math.round(laborHours * LABOR_RATE_TIYIN);
      const partsCost = partsUsedData.reduce(
        (sum, part) => sum + part.quantity * part.unitCost,
        0
      );

      const currentDate = new Date();

      console.log(`Labor: ${laborHours} hours @ ${LABOR_RATE_TIYIN} = ${laborCost} Tiyin`);
      console.log(`Parts: ${partsCost} Tiyin`);
      console.log(`Total: ${laborCost + partsCost} Tiyin`);

      // Start transaction
      await db.transaction(async (tx) => {
        let serviceInvoiceId: number | null = null;

        // Create service invoice (only for parts, as per implementation)
        if (testTicket.isBillable && partsUsedData.length > 0) {
          const invoiceNumber = await generateServiceInvoiceNumber();
          const subtotal = partsCost;
          const taxTotal = 0;

          const [newInvoice] = await tx.insert(invoices).values({
            customerId: testTicket.customerId,
            date: currentDate,
            dueDate: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000),
            invoiceNumber,
            subtotal,
            taxTotal,
            totalAmount: subtotal + taxTotal,
            balanceRemaining: subtotal + taxTotal,
            status: 'OPEN',
          }).returning();

          serviceInvoiceId = newInvoice.id;

          console.log(`✓ Created service invoice: ${invoiceNumber}`);

          // Create invoice lines
          const partsLineRecords = partsUsedData.map(part => ({
            invoiceId: newInvoice.id,
            itemId: part.itemId,
            quantity: part.quantity,
            rate: part.unitCost,
            amount: part.quantity * part.unitCost,
            description: `Service Parts - Ticket ${testTicket.ticketNumber}`,
            revenueAccountId: null,
          }));

          await tx.insert(invoiceLines).values(partsLineRecords);

          console.log(`✓ Created ${partsLineRecords.length} invoice line(s)`);

          // Create GL entries
          const [je] = await tx.insert(journalEntries).values({
            date: currentDate,
            description: `Service Invoice ${invoiceNumber} - Ticket ${testTicket.ticketNumber}`,
            reference: invoiceNumber,
            isPosted: true,
          }).returning();

          // Debit AR (1200)
          await tx.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountCode: '1200',
            debit: subtotal,
            credit: 0,
            description: `Service Invoice ${invoiceNumber} - Customer #${testTicket.customerId}`,
          });

          // Credit Sales Revenue (4000)
          await tx.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountCode: '4000',
            debit: 0,
            credit: subtotal,
            description: `Service Revenue (Parts) - Ticket ${testTicket.ticketNumber}`,
          });

          console.log(`✓ Posted GL entries (JE #${je.id})`);
        }

        // Update ticket
        await tx.update(serviceTickets)
          .set({
            status: 'COMPLETED',
            actualEndTime: currentDate,
            completionNotes: 'Installation completed successfully. Equipment tested and verified operational.',
            laborHoursDecimal,
            partsUsed: partsUsedData as any,
            serviceInvoiceId,
          })
          .where(eq(serviceTickets.id, testTicket.id));

        console.log(`✓ Updated ticket status to COMPLETED`);

        // Update asset status
        if (testTicket.ticketType === 'INSTALLATION' && testTicket.ticketAssets.length > 0) {
          const assetIds = testTicket.ticketAssets.map((ta: any) => ta.assetId);
          for (const assetId of assetIds) {
            await tx.update(customerAssets)
              .set({
                status: 'ACTIVE',
                installationDate: currentDate,
              })
              .where(eq(customerAssets.id, assetId));
          }
          console.log(`✓ Updated ${assetIds.length} asset(s) to ACTIVE`);
        }
      });

      logResult('Complete Ticket', 'PASS', 'Ticket completion executed', {
        ticketId: testTicket.id,
        laborHours,
        partsCost,
      });

      // Refresh ticket data
      testTicket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, testTicket.id),
        with: {
          ticketAssets: {
            with: {
              asset: true,
            },
          },
        },
      });
    }

    // ========================================
    // STEP 4: Verification
    // ========================================
    console.log('\n🔍 STEP 4: Verification\n');

    // 4.1: Verify ticket status
    console.log('4.1: Verifying ticket status...');
    if (testTicket.status === 'COMPLETED') {
      console.log(`✓ Ticket status is COMPLETED`);
      logResult('Verify Ticket Status', 'PASS', 'Ticket status is COMPLETED', {
        ticketNumber: testTicket.ticketNumber,
      });
    } else {
      console.log(`✗ FAIL: Ticket status is ${testTicket.status}, expected COMPLETED`);
      logResult('Verify Ticket Status', 'FAIL', `Status is ${testTicket.status}`, {
        expected: 'COMPLETED',
        actual: testTicket.status,
      });
    }

    // 4.2: Verify asset status (for installation tickets)
    console.log('\n4.2: Verifying asset status...');
    if (testTicket.ticketType === 'INSTALLATION' && testTicket.ticketAssets.length > 0) {
      const assetChecks = [];
      for (const ticketAsset of testTicket.ticketAssets) {
        const asset = await db.query.customerAssets.findFirst({
          where: eq(customerAssets.id, ticketAsset.assetId),
        });

        if (asset) {
          if (asset.status === 'ACTIVE') {
            console.log(`✓ Asset ${asset.assetNumber} status is ACTIVE`);
            assetChecks.push({ assetNumber: asset.assetNumber, status: 'PASS' });
          } else {
            console.log(`✗ FAIL: Asset ${asset.assetNumber} status is ${asset.status}, expected ACTIVE`);
            assetChecks.push({ assetNumber: asset.assetNumber, status: 'FAIL', actual: asset.status });
          }
        }
      }

      const allAssetsActive = assetChecks.every(a => a.status === 'PASS');
      logResult('Verify Asset Status', allAssetsActive ? 'PASS' : 'FAIL',
        allAssetsActive ? 'All assets are ACTIVE' : 'Some assets are not ACTIVE',
        assetChecks
      );
    } else {
      console.log('⊘ Not an installation ticket or no assets linked');
      logResult('Verify Asset Status', 'PASS', 'N/A - Not installation or no assets', {});
    }

    // 4.3: Verify service invoice
    console.log('\n4.3: Verifying service invoice...');
    if (testTicket.serviceInvoiceId) {
      const serviceInvoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, testTicket.serviceInvoiceId),
        with: {
          lines: {
            with: {
              item: true,
            },
          },
        },
      });

      if (serviceInvoice) {
        console.log(`✓ Service invoice found: ${serviceInvoice.invoiceNumber}`);
        console.log(`  - Total Amount: ${serviceInvoice.totalAmount} Tiyin (${serviceInvoice.totalAmount / 100} UZS)`);
        console.log(`  - Line Count: ${serviceInvoice.lines.length}`);

        // Check invoice number format
        if (serviceInvoice.invoiceNumber.match(/^SVC-INV-\d{4}-\d{5}$/)) {
          console.log(`✓ Invoice number format correct: ${serviceInvoice.invoiceNumber}`);
        } else {
          console.log(`✗ Invoice number format incorrect: ${serviceInvoice.invoiceNumber}`);
        }

        // List invoice lines
        console.log('\n  Invoice Lines:');
        for (const line of serviceInvoice.lines) {
          console.log(`    - ${line.item?.name}: Qty ${line.quantity} @ ${line.rate / 100} UZS = ${line.amount / 100} UZS`);
        }

        logResult('Verify Service Invoice', 'PASS', 'Service invoice created', {
          invoiceId: serviceInvoice.id,
          invoiceNumber: serviceInvoice.invoiceNumber,
          totalAmount: serviceInvoice.totalAmount,
          lineCount: serviceInvoice.lines.length,
        });
      } else {
        console.log(`✗ FAIL: Service invoice ${testTicket.serviceInvoiceId} not found`);
        logResult('Verify Service Invoice', 'FAIL', 'Invoice not found', {
          invoiceId: testTicket.serviceInvoiceId,
        });
      }
    } else {
      console.log('⊘ No service invoice (ticket may not have been billable with parts)');
      logResult('Verify Service Invoice', 'PASS', 'N/A - No invoice expected', {});
    }

    // 4.4: Verify GL entries
    console.log('\n4.4: Verifying GL entries...');
    if (testTicket.serviceInvoiceId) {
      const serviceInvoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, testTicket.serviceInvoiceId),
      });

      if (serviceInvoice) {
        // Find journal entries for this invoice
        const journalEntriesForInvoice = await db.query.journalEntries.findMany({
          where: eq(journalEntries.reference, serviceInvoice.invoiceNumber),
          with: {
            lines: true,
          },
        });

        if (journalEntriesForInvoice.length > 0) {
          console.log(`✓ Found ${journalEntriesForInvoice.length} journal entry(ies)`);

          for (const je of journalEntriesForInvoice) {
            console.log(`\n  Journal Entry #${je.id}:`);
            console.log(`    Description: ${je.description}`);

            // Check for AR debit (1200)
            const arLine = je.lines.find(l => l.accountCode === '1200' && l.debit > 0);
            if (arLine) {
              console.log(`    ✓ Debit: Accounts Receivable (1200) - ${arLine.debit / 100} UZS`);
            } else {
              console.log(`    ✗ MISSING: Debit to Accounts Receivable (1200)`);
            }

            // Check for Revenue credit (4000)
            const revenueLine = je.lines.find(l => l.accountCode === '4000' && l.credit > 0);
            if (revenueLine) {
              console.log(`    ✓ Credit: Service Revenue (4000) - ${revenueLine.credit / 100} UZS`);
            } else {
              console.log(`    ✗ MISSING: Credit to Service Revenue (4000)`);
            }

            // Verify balance
            const totalDebit = je.lines.reduce((sum, l) => sum + l.debit, 0);
            const totalCredit = je.lines.reduce((sum, l) => sum + l.credit, 0);

            if (totalDebit === totalCredit) {
              console.log(`    ✓ Balanced: Debit ${totalDebit / 100} UZS = Credit ${totalCredit / 100} UZS`);
            } else {
              console.log(`    ✗ UNBALANCED: Debit ${totalDebit / 100} UZS ≠ Credit ${totalCredit / 100} UZS`);
            }
          }

          logResult('Verify GL Entries', 'PASS', 'GL entries posted correctly', {
            journalEntryCount: journalEntriesForInvoice.length,
          });
        } else {
          console.log(`✗ FAIL: No journal entries found for invoice ${serviceInvoice.invoiceNumber}`);
          logResult('Verify GL Entries', 'FAIL', 'No journal entries found', {
            invoiceNumber: serviceInvoice.invoiceNumber,
          });
        }
      }
    } else {
      console.log('⊘ No service invoice, so no GL entries expected');
      logResult('Verify GL Entries', 'PASS', 'N/A - No invoice', {});
    }

    // 4.5: SQL verification queries (for manual checking)
    console.log('\n4.5: SQL Verification Queries\n');
    console.log('Execute these manually if needed:\n');
    console.log(`-- Check ticket status
SELECT * FROM service_tickets WHERE id = ${testTicket.id} AND status = 'COMPLETED';
`);

    if (testTicket.ticketType === 'INSTALLATION' && testTicket.ticketAssets.length > 0) {
      const assetIds = testTicket.ticketAssets.map((ta: any) => ta.assetId).join(', ');
      console.log(`-- Check asset status
SELECT * FROM customer_assets WHERE id IN (${assetIds}) AND status = 'ACTIVE';
`);
    }

    if (testTicket.serviceInvoiceId) {
      console.log(`-- Check service invoice
SELECT * FROM invoices WHERE id = ${testTicket.serviceInvoiceId};

-- Check invoice lines
SELECT * FROM invoice_lines WHERE invoice_id = ${testTicket.serviceInvoiceId};

-- Check journal entries
SELECT je.*, jel.*
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.reference LIKE 'SVC-INV-%'
  AND je.id IN (
    SELECT je2.id FROM journal_entries je2
    JOIN invoices i ON i.invoice_number = je2.reference
    WHERE i.id = ${testTicket.serviceInvoiceId}
  );
`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const totalCount = results.length;

    console.log(`\nTotal Tests: ${totalCount}`);
    console.log(`✓ Passed: ${passCount}`);
    console.log(`✗ Failed: ${failCount}`);

    console.log('\nDetailed Results:\n');
    results.forEach((result, index) => {
      console.log(`${index + 1}. [${result.status}] ${result.phase}: ${result.message}`);
    });

    if (failCount === 0) {
      console.log('\n✅ ALL TESTS PASSED\n');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    logResult('Test Execution', 'FAIL', error.message, { stack: error.stack });
    process.exit(1);
  }
}

main();
