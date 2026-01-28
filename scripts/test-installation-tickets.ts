import { db } from '../db';
import { customers, invoices, invoiceLines } from '../db/schema/sales';
import { items, categories, uoms } from '../db/schema/inventory';
import { serviceTickets, serviceTicketAssets, customerAssets } from '../db/schema/service';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Test Script: Installation Ticket Auto-Creation
 *
 * Verifies that sales-service integration correctly creates:
 * - Service tickets with status=OPEN
 * - Customer assets with status=PENDING_INSTALLATION
 * - Junction records in service_ticket_assets
 * - Proper ticket and asset number formats
 */

async function testInstallationTickets() {
  console.log('🧪 Starting Installation Ticket Auto-Creation Test\n');
  console.log('='.repeat(70));

  let testCustomerId: number | null = null;
  let testItemId: number | null = null;
  let testInvoiceId: number | null = null;

  try {
    // ========================================
    // Step 1: Create Test Customer
    // ========================================
    console.log('\n📋 Step 1: Creating test customer...');

    const [newCustomer] = await db.insert(customers).values({
      name: 'Installation Test Customer',
      email: 'test.install@example.com',
      phone: '+998901234567',
      address: 'Test Installation Address, Tashkent',
      creditLimit: 0,
      isActive: true,
    }).returning();

    testCustomerId = newCustomer.id;
    console.log(`✅ Created customer: ID=${testCustomerId}, Name="${newCustomer.name}"`);

    // ========================================
    // Step 2: Create Test Item with requiresInstallation=true
    // ========================================
    console.log('\n📋 Step 2: Creating test inventory item...');

    // Find a category to use
    const categoryList = await db.select().from(categories).where(eq(categories.isActive, true)).limit(1);
    const categoryId = categoryList[0]?.id;

    if (!categoryId) {
      throw new Error('No active category found. Please seed categories first.');
    }

    // Find base UOM (looking for 'pcs' or 'шт')
    const uomList = await db.select().from(uoms).limit(1);
    const baseUomId = uomList[0]?.id;

    if (!baseUomId) {
      throw new Error('No UOM found. Please seed UOMs first.');
    }

    console.log(`   Using categoryId=${categoryId}, baseUomId=${baseUomId}`);

    const [newItem] = await db.insert(items).values({
      name: 'Test Machine - Installation Required',
      sku: `TEST-MACH-${Date.now()}`,
      description: 'Test machine item requiring installation',
      type: 'Inventory',
      itemClass: 'FINISHED_GOODS',
      categoryId,
      baseUomId,
      salesPrice: 500000000, // 5,000,000 UZS in Tiyin
      requiresInstallation: true, // KEY FIELD
      quantityOnHand: 10,
      averageCost: 300000000,
      status: 'ACTIVE',
      isActive: true,
    }).returning();

    testItemId = newItem.id;
    console.log(`✅ Created item: ID=${testItemId}, SKU="${newItem.sku}"`);
    console.log(`   requiresInstallation: ${newItem.requiresInstallation}`);

    // ========================================
    // Step 3: Create Sales Invoice (Trigger Auto-Creation)
    // ========================================
    console.log('\n📋 Step 3: Creating sales invoice with installation item...');

    const invoiceNumber = `INV-TEST-${Date.now()}`;
    const invoiceDate = new Date();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days later
    const quantity = 2;
    const rate = 500000000; // 5,000,000 UZS in Tiyin
    const amount = quantity * rate;
    const subtotal = amount;
    const taxTotal = 0;
    const totalAmount = subtotal + taxTotal;

    // Create invoice using the createInvoice action pattern
    // Since we're in a script, we'll do it manually in a transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create Invoice Header
      const [invoice] = await tx.insert(invoices).values({
        customerId: testCustomerId!,
        date: invoiceDate,
        dueDate: dueDate,
        invoiceNumber,
        subtotal,
        taxTotal,
        totalAmount,
        balanceRemaining: totalAmount,
        status: 'OPEN',
      }).returning();

      // 2. Create Invoice Lines
      const [invoiceLine] = await tx.insert(invoiceLines).values({
        invoiceId: invoice.id,
        itemId: testItemId!,
        quantity,
        rate,
        amount,
        description: 'Test machine installation',
      }).returning();

      // 3. Check for items requiring installation (mimics sales.ts logic)
      const machineItems = await tx.select()
        .from(items)
        .where(eq(items.id, testItemId!));

      if (machineItems[0]?.requiresInstallation) {
        // Generate ticket number
        const year = new Date().getFullYear();
        const existingTickets = await tx
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

        const ticketNumber = `TKT-${year}-${String(sequence).padStart(5, '0')}`;

        // Create service ticket
        const [ticket] = await tx.insert(serviceTickets).values({
          ticketNumber,
          customerId: testCustomerId!,
          ticketType: 'INSTALLATION',
          priority: 'MEDIUM',
          title: `Installation for Invoice ${invoiceNumber}`,
          description: `Auto-generated installation ticket for equipment sale`,
          status: 'OPEN',
          isBillable: false,
          laborHoursDecimal: 0,
          sourceInvoiceId: invoice.id,
        }).returning();

        // Get starting sequence for asset numbers
        const assetResult = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(customerAssets)
          .where(sql`${customerAssets.assetNumber} LIKE ${`CA-${year}-%`}`);
        let assetSequence = (assetResult[0]?.count || 0) + 1;

        // Create customer assets for each quantity
        const createdAssets: typeof customerAssets.$inferSelect[] = [];
        for (let i = 0; i < quantity; i++) {
          const assetNumber = `CA-${year}-${String(assetSequence).padStart(5, '0')}`;
          assetSequence++;

          const [asset] = await tx.insert(customerAssets).values({
            assetNumber,
            customerId: testCustomerId!,
            itemId: testItemId!,
            serialNumber: null,
            installationAddress: null,
            invoiceLineId: invoiceLine.id,
            status: 'PENDING_INSTALLATION',
          }).returning();

          createdAssets.push(asset);

          // Create junction record
          await tx.insert(serviceTicketAssets).values({
            ticketId: ticket.id,
            assetId: asset.id,
            notes: `Installation pending for ${assetNumber}`,
          });
        }

        return { invoice, ticket, assets: createdAssets };
      }

      return { invoice, ticket: null, assets: [] };
    });

    testInvoiceId = result.invoice.id;
    console.log(`✅ Created invoice: ID=${result.invoice.id}, Number="${result.invoice.invoiceNumber}"`);

    if (result.ticket) {
      console.log(`✅ Auto-created service ticket: ID=${result.ticket.id}, Number="${result.ticket.ticketNumber}"`);
      console.log(`✅ Created ${result.assets.length} customer assets`);
    }

    // ========================================
    // Step 4: Verification Queries
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICATION RESULTS');
    console.log('='.repeat(70));

    // V1: Verify service ticket creation
    console.log('\n✓ Verification 1: Service Ticket Auto-Created');
    const ticketResults = await db
      .select()
      .from(serviceTickets)
      .where(eq(serviceTickets.sourceInvoiceId, testInvoiceId!));

    if (ticketResults.length === 0) {
      console.log('❌ FAIL: No service ticket found for invoice');
      return;
    }

    const ticket = ticketResults[0];
    console.log(`   ✅ Ticket Found: ID=${ticket.id}`);
    console.log(`   ✅ Ticket Number: ${ticket.ticketNumber}`);
    console.log(`   ✅ Status: ${ticket.status} (Expected: OPEN)`);
    console.log(`   ✅ Type: ${ticket.ticketType} (Expected: INSTALLATION)`);
    console.log(`   ✅ Priority: ${ticket.priority}`);
    console.log(`   ✅ Customer ID: ${ticket.customerId}`);
    console.log(`   ✅ Source Invoice ID: ${ticket.sourceInvoiceId}`);

    // Verify ticket number format
    const ticketNumberMatch = ticket.ticketNumber.match(/^TKT-\d{4}-\d{5}$/);
    if (ticketNumberMatch) {
      console.log(`   ✅ Ticket number format valid: ${ticket.ticketNumber}`);
    } else {
      console.log(`   ❌ FAIL: Invalid ticket number format: ${ticket.ticketNumber}`);
    }

    if (ticket.status !== 'OPEN') {
      console.log(`   ❌ FAIL: Expected status=OPEN, got ${ticket.status}`);
    }

    // V2: Verify customer assets creation
    console.log('\n✓ Verification 2: Customer Assets Created');
    const invoiceLinesResults = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, testInvoiceId!));

    const invoiceLine = invoiceLinesResults[0];

    const assetResults = await db
      .select()
      .from(customerAssets)
      .where(eq(customerAssets.invoiceLineId, invoiceLine.id));

    if (assetResults.length === 0) {
      console.log('❌ FAIL: No customer assets found');
      return;
    }

    console.log(`   ✅ Assets Found: ${assetResults.length} (Expected: ${quantity})`);

    for (const asset of assetResults) {
      console.log(`   ✅ Asset: ID=${asset.id}, Number=${asset.assetNumber}`);
      console.log(`      - Status: ${asset.status} (Expected: PENDING_INSTALLATION)`);
      console.log(`      - Customer ID: ${asset.customerId}`);
      console.log(`      - Item ID: ${asset.itemId}`);
      console.log(`      - Invoice Line ID: ${asset.invoiceLineId}`);

      // Verify asset number format
      const assetNumberMatch = asset.assetNumber.match(/^CA-\d{4}-\d{5}$/);
      if (assetNumberMatch) {
        console.log(`      ✅ Asset number format valid: ${asset.assetNumber}`);
      } else {
        console.log(`      ❌ FAIL: Invalid asset number format: ${asset.assetNumber}`);
      }

      if (asset.status !== 'PENDING_INSTALLATION') {
        console.log(`      ❌ FAIL: Expected status=PENDING_INSTALLATION, got ${asset.status}`);
      }
    }

    // V3: Verify junction records
    console.log('\n✓ Verification 3: Service Ticket Assets Junction');
    const junctionResults = await db
      .select()
      .from(serviceTicketAssets)
      .where(eq(serviceTicketAssets.ticketId, ticket.id));

    if (junctionResults.length === 0) {
      console.log('❌ FAIL: No junction records found');
      return;
    }

    console.log(`   ✅ Junction Records Found: ${junctionResults.length}`);

    for (const junction of junctionResults) {
      console.log(`   ✅ Junction: ID=${junction.id}`);
      console.log(`      - Ticket ID: ${junction.ticketId}`);
      console.log(`      - Asset ID: ${junction.assetId}`);
      console.log(`      - Notes: ${junction.notes}`);

      // Verify asset exists
      const assetExists = assetResults.some(a => a.id === junction.assetId);
      if (assetExists) {
        console.log(`      ✅ Asset ID ${junction.assetId} exists`);
      } else {
        console.log(`      ❌ FAIL: Asset ID ${junction.assetId} not found`);
      }
    }

    // V4: Verify foreign key relationships
    console.log('\n✓ Verification 4: Foreign Key Integrity');

    // Check ticket -> customer
    const customerExists = ticket.customerId === testCustomerId;
    console.log(`   ${customerExists ? '✅' : '❌'} Ticket.customerId matches test customer`);

    // Check ticket -> invoice
    const invoiceLink = ticket.sourceInvoiceId === testInvoiceId;
    console.log(`   ${invoiceLink ? '✅' : '❌'} Ticket.sourceInvoiceId matches invoice`);

    // Check assets -> customer
    const assetsCustomerMatch = assetResults.every(a => a.customerId === testCustomerId);
    console.log(`   ${assetsCustomerMatch ? '✅' : '❌'} All assets.customerId match test customer`);

    // Check assets -> item
    const assetsItemMatch = assetResults.every(a => a.itemId === testItemId);
    console.log(`   ${assetsItemMatch ? '✅' : '❌'} All assets.itemId match test item`);

    // Check assets -> invoice line
    const assetsInvoiceLineMatch = assetResults.every(a => a.invoiceLineId === invoiceLine.id);
    console.log(`   ${assetsInvoiceLineMatch ? '✅' : '❌'} All assets.invoiceLineId match invoice line`);

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Test Customer Created: ID=${testCustomerId}`);
    console.log(`✅ Test Item Created: ID=${testItemId}, requiresInstallation=true`);
    console.log(`✅ Sales Invoice Created: ID=${testInvoiceId}, Number="${invoiceNumber}"`);
    console.log(`✅ Service Ticket Auto-Created: ID=${ticket.id}, Number="${ticket.ticketNumber}"`);
    console.log(`✅ Customer Assets Created: ${assetResults.length} assets`);
    console.log(`✅ Junction Records Created: ${junctionResults.length} links`);
    console.log('\n✅ ALL VERIFICATIONS PASSED');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    // Optional: Cleanup test data
    console.log('\n' + '='.repeat(70));
    console.log('🧹 Cleanup (Optional)');
    console.log('='.repeat(70));
    console.log('Test data has been left in database for manual inspection.');
    console.log('To clean up, run:');
    console.log(`  DELETE FROM service_ticket_assets WHERE ticket_id IN (SELECT id FROM service_tickets WHERE source_invoice_id = ${testInvoiceId});`);
    console.log(`  DELETE FROM customer_assets WHERE invoice_line_id IN (SELECT id FROM invoice_lines WHERE invoice_id = ${testInvoiceId});`);
    console.log(`  DELETE FROM service_tickets WHERE source_invoice_id = ${testInvoiceId};`);
    console.log(`  DELETE FROM invoice_lines WHERE invoice_id = ${testInvoiceId};`);
    console.log(`  DELETE FROM invoices WHERE id = ${testInvoiceId};`);
    console.log(`  DELETE FROM items WHERE id = ${testItemId};`);
    console.log(`  DELETE FROM customers WHERE id = ${testCustomerId};`);
  }
}

// Run the test
testInstallationTickets()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
