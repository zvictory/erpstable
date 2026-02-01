import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { db } from '../../../db';
import {
  createInstallationTicket,
  createServiceContract,
  generateRecurringRefills,
  completeServiceTicket,
  suspendContract,
  expireOldContracts,
} from './service';
import { customers } from '../../../db/schema/sales';
import { items } from '../../../db/schema/inventory';
import { invoices, invoiceLines } from '../../../db/schema/sales';
import {
  customerAssets,
  serviceContracts,
  contractRefillItems,
  serviceTickets,
  serviceTicketAssets,
} from '../../../db/schema/service';
import { eq, and } from 'drizzle-orm';
import { ensureTestCategory, ensureTestUom } from './test-helpers/db-setup';

// Mock auth
jest.mock('../../../src/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user', email: 'test@example.com' } })),
}));

// Mock checkPeriodLock
jest.mock('./finance', () => ({
  checkPeriodLock: jest.fn(() => Promise.resolve()),
}));

describe('Service Module Server Actions', () => {
  let testCustomerId: number;
  let testItemId: number;
  let testInvoiceId: number;
  let testInvoiceLineId: number;
  let timestamp: number;
  let testCategoryId: number;
  let testUomId: number;

  beforeEach(async () => {
    // Use timestamp to create unique test data
    timestamp = Date.now();

    // Get test category and UOM
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();

    // Create test customer with unique name
    const [customer] = await db.insert(customers).values({
      name: `Test Customer ${timestamp}`,
      email: `test${timestamp}@customer.com`,
      phone: `${timestamp}`,
    }).returning();
    testCustomerId = customer.id;

    // Create test item (machine) with unique SKU
    const [item] = await db.insert(items).values({
      sku: `MACHINE-${timestamp}`,
      name: `Test Coffee Machine ${timestamp}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'FINISHED_GOODS',
      valuationMethod: 'FIFO',
      quantityOnHand: 10,
      averageCost: 1000000, // 10,000 UZS
      requiresInstallation: true,
    }).returning();
    testItemId = item.id;

    // Create test invoice with unique number
    const [invoice] = await db.insert(invoices).values({
      customerId: testCustomerId,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      invoiceNumber: `INV-TEST-${timestamp}`,
      subtotal: 1000000,
      taxTotal: 0,
      totalAmount: 1000000,
      balanceRemaining: 1000000,
      status: 'OPEN',
    }).returning();
    testInvoiceId = invoice.id;

    // Create test invoice line
    const [line] = await db.insert(invoiceLines).values({
      invoiceId: testInvoiceId,
      itemId: testItemId,
      quantity: 1,
      rate: 1000000,
      amount: 1000000,
      description: 'Coffee Machine Sale',
    }).returning();
    testInvoiceLineId = line.id;
  });

  describe('1. createInstallationTicket()', () => {
    it('should create installation ticket with customer assets', async () => {
      const result = await createInstallationTicket({
        invoiceId: testInvoiceId,
        customerId: testCustomerId,
        machineInvoiceLines: [
          {
            invoiceLineId: testInvoiceLineId,
            itemId: testItemId,
            serialNumber: 'SN-12345',
            installationAddress: '123 Test Street',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
      expect(result.assetIds).toHaveLength(1);

      // Verify ticket was created
      const ticket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, result.ticketId),
      });

      expect(ticket).toBeDefined();
      expect(ticket?.ticketType).toBe('INSTALLATION');
      expect(ticket?.status).toBe('OPEN');
      expect(ticket?.sourceInvoiceId).toBe(testInvoiceId);

      // Verify asset was created
      const asset = await db.query.customerAssets.findFirst({
        where: eq(customerAssets.id, result.assetIds[0]),
      });

      expect(asset).toBeDefined();
      expect(asset?.assetNumber).toMatch(/^CA-\d{4}-\d{5}$/);
      expect(asset?.status).toBe('PENDING_INSTALLATION');
      expect(asset?.serialNumber).toBe('SN-12345');
      expect(asset?.installationAddress).toBe('123 Test Street');

      // Verify junction record was created
      const junction = await db.query.serviceTicketAssets.findFirst({
        where: and(
          eq(serviceTicketAssets.ticketId, result.ticketId),
          eq(serviceTicketAssets.assetId, result.assetIds[0])
        ),
      });

      expect(junction).toBeDefined();
    });

    it('should handle multiple machines in one ticket', async () => {
      // Create second item and invoice line
      const ts2 = Date.now() + 1;
      const [item2] = await db.insert(items).values({
        sku: `MACHINE-${ts2}`,
        name: `Test Espresso Machine ${ts2}`,
        categoryId: testCategoryId,
        baseUomId: testUomId,
        itemClass: 'FINISHED_GOODS',
        valuationMethod: 'FIFO',
        quantityOnHand: 5,
        averageCost: 1500000,
        requiresInstallation: true,
      }).returning();

      const [line2] = await db.insert(invoiceLines).values({
        invoiceId: testInvoiceId,
        itemId: item2.id,
        quantity: 1,
        rate: 1500000,
        amount: 1500000,
        description: 'Espresso Machine Sale',
      }).returning();

      const result = await createInstallationTicket({
        invoiceId: testInvoiceId,
        customerId: testCustomerId,
        machineInvoiceLines: [
          {
            invoiceLineId: testInvoiceLineId,
            itemId: testItemId,
            serialNumber: 'SN-11111',
          },
          {
            invoiceLineId: line2.id,
            itemId: item2.id,
            serialNumber: 'SN-22222',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.assetIds).toHaveLength(2);

      // Verify both assets were created
      const assets = await db.query.customerAssets.findMany({
        where: eq(customerAssets.customerId, testCustomerId),
      });

      expect(assets).toHaveLength(2);
    });

    it('should throw error for invalid invoice', async () => {
      await expect(
        createInstallationTicket({
          invoiceId: 99999,
          customerId: testCustomerId,
          machineInvoiceLines: [
            {
              invoiceLineId: testInvoiceLineId,
              itemId: testItemId,
            },
          ],
        })
      ).rejects.toThrow('Invoice #99999 not found');
    });
  });

  describe('2. generateRecurringRefills()', () => {
    let testContractId: number;
    let testRefillItemId: number;

    beforeEach(async () => {
      // Create refill item with unique SKU
      const refillTs = Date.now() + 100;
      const [refillItem] = await db.insert(items).values({
        sku: `COFFEE-BEANS-${refillTs}`,
        name: `Premium Coffee Beans ${refillTs}`,
        categoryId: testCategoryId,
        baseUomId: testUomId,
        itemClass: 'RAW_MATERIAL',
        valuationMethod: 'FIFO',
        quantityOnHand: 100,
        averageCost: 50000, // 500 UZS per kg
      }).returning();
      testRefillItemId = refillItem.id;

      // Create active contract due for refill
      const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const nextBillingDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Yesterday (overdue)
      const endDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000); // 300 days from now

      const [contract] = await db.insert(serviceContracts).values({
        contractNumber: `AMC-TEST-${refillTs}`,
        customerId: testCustomerId,
        contractType: 'SUPPLIES_ONLY',
        startDate,
        endDate,
        billingFrequencyMonths: 1,
        nextBillingDate,
        autoGenerateRefills: true,
        monthlyValue: 500000, // 5,000 UZS per month
        status: 'ACTIVE',
      }).returning();
      testContractId = contract.id;

      // Add refill item to contract
      await db.insert(contractRefillItems).values({
        contractId: testContractId,
        itemId: testRefillItemId,
        quantityPerCycle: 10, // 10 kg per cycle
        contractUnitPrice: 50000, // 500 UZS per kg
      });
    });

    it('should generate refill invoice for due contract', async () => {
      const result = await generateRecurringRefills();

      expect(result.success).toBe(true);
      // Don't check exact count since other tests may have created contracts
      expect(result.results.total).toBeGreaterThanOrEqual(1);
      expect(result.results.success).toBeGreaterThanOrEqual(1);

      // Verify invoice was created for our specific customer
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.customerId, testCustomerId),
        orderBy: (invoices, { desc }) => [desc(invoices.id)],
      });

      expect(invoice).toBeDefined();
      expect(invoice?.invoiceNumber).toMatch(/^SO-REFILL-\d{4}-\d{5}$/);
      expect(invoice?.status).toBe('OPEN');
      expect(invoice?.subtotal).toBe(500000); // 10 kg * 50,000 Tiyin

      // Verify invoice line was created
      const lines = await db.query.invoiceLines.findMany({
        where: eq(invoiceLines.invoiceId, invoice!.id),
      });

      expect(lines).toHaveLength(1);
      expect(lines[0].itemId).toBe(testRefillItemId);
      expect(lines[0].quantity).toBe(10);
      expect(lines[0].rate).toBe(50000);

      // Verify next billing date was updated
      const updatedContract = await db.query.serviceContracts.findFirst({
        where: eq(serviceContracts.id, testContractId),
      });

      expect(updatedContract?.nextBillingDate).toBeDefined();
      const nextDate = new Date(updatedContract!.nextBillingDate!);
      const expectedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      expectedDate.setMonth(expectedDate.getMonth() + 1);

      expect(nextDate.getMonth()).toBe(expectedDate.getMonth());
    });

    it('should skip contract with no refill items', async () => {
      // Create contract without refill items
      const emptyTs = Date.now() + 200;
      const [emptyContract] = await db.insert(serviceContracts).values({
        contractNumber: `AMC-EMPTY-${emptyTs}`,
        customerId: testCustomerId,
        contractType: 'MAINTENANCE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingFrequencyMonths: 1,
        nextBillingDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        autoGenerateRefills: true,
        monthlyValue: 100000,
        status: 'ACTIVE',
      }).returning();

      const result = await generateRecurringRefills();

      expect(result.success).toBe(true);
      // Check that at least one contract was skipped
      expect(result.results.skipped).toBeGreaterThanOrEqual(1);
      expect(result.results.errors.length).toBeGreaterThanOrEqual(1);

      // Verify our specific empty contract was in the errors
      const ourError = result.results.errors.find((e: any) => e.contractId === emptyContract.id);
      expect(ourError).toBeDefined();
      expect(ourError?.error).toBe('No refill items configured');
    });

    it('should not generate for inactive contracts', async () => {
      // Suspend the contract
      await db.update(serviceContracts)
        .set({ status: 'SUSPENDED', autoGenerateRefills: false })
        .where(eq(serviceContracts.id, testContractId));

      // Count invoices before
      const invoicesBefore = await db.query.invoices.findMany({
        where: eq(invoices.customerId, testCustomerId),
      });

      const result = await generateRecurringRefills();

      expect(result.success).toBe(true);

      // Verify no new invoice created for our suspended contract
      const invoicesAfter = await db.query.invoices.findMany({
        where: eq(invoices.customerId, testCustomerId),
      });

      expect(invoicesAfter.length).toBe(invoicesBefore.length);
    });

    it('should not generate for contracts not yet due', async () => {
      // Update next billing date to future
      await db.update(serviceContracts)
        .set({ nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
        .where(eq(serviceContracts.id, testContractId));

      // Count invoices before
      const invoicesBefore = await db.query.invoices.findMany({
        where: eq(invoices.customerId, testCustomerId),
      });

      const result = await generateRecurringRefills();

      expect(result.success).toBe(true);

      // Verify no new invoice created for our not-yet-due contract
      const invoicesAfter = await db.query.invoices.findMany({
        where: eq(invoices.customerId, testCustomerId),
      });

      expect(invoicesAfter.length).toBe(invoicesBefore.length);
    });
  });

  describe('3. completeServiceTicket()', () => {
    let testTicketId: number;
    let testAssetId: number;

    beforeEach(async () => {
      // Create service ticket with unique number
      const ticketTs = Date.now() + 300;
      const [ticket] = await db.insert(serviceTickets).values({
        ticketNumber: `TKT-TEST-${ticketTs}`,
        customerId: testCustomerId,
        ticketType: 'INSTALLATION',
        priority: 'MEDIUM',
        title: `Install Coffee Machine ${ticketTs}`,
        status: 'IN_PROGRESS',
        isBillable: true,
        laborHoursDecimal: 0,
      }).returning();
      testTicketId = ticket.id;

      // Create customer asset with unique number
      const [asset] = await db.insert(customerAssets).values({
        assetNumber: `CA-TEST-${ticketTs}`,
        customerId: testCustomerId,
        itemId: testItemId,
        status: 'PENDING_INSTALLATION',
      }).returning();
      testAssetId = asset.id;

      // Link asset to ticket
      await db.insert(serviceTicketAssets).values({
        ticketId: testTicketId,
        assetId: testAssetId,
      });
    });

    it('should complete ticket with labor and parts, create invoice', async () => {
      const result = await completeServiceTicket({
        ticketId: testTicketId,
        completionNotes: 'Installation completed successfully',
        laborHours: 2.5,
        partsUsed: [
          {
            itemId: testItemId,
            quantity: 2,
            unitCost: 25000, // 250 UZS
          },
        ],
        customerSignature: 'base64-signature-data',
      });

      expect(result.success).toBe(true);
      expect(result.serviceInvoiceId).toBeDefined();

      // Verify ticket was updated
      const ticket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, testTicketId),
      });

      expect(ticket?.status).toBe('COMPLETED');
      expect(ticket?.completionNotes).toBe('Installation completed successfully');
      expect(ticket?.laborHoursDecimal).toBe(250); // 2.5 hours * 100
      expect(ticket?.customerSignature).toBe('base64-signature-data');

      // Verify invoice was created
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, result.serviceInvoiceId!),
      });

      expect(invoice).toBeDefined();
      expect(invoice?.invoiceNumber).toMatch(/^SVC-INV-\d{4}-\d{5}$/);

      // Parts cost only: 2 * 25,000 = 50,000 Tiyin
      // (Labor is tracked in ticket but not invoiced separately in this simplified version)
      expect(invoice?.subtotal).toBe(50000);
      expect(invoice?.totalAmount).toBe(50000);

      // Verify invoice lines (parts only)
      const lines = await db.query.invoiceLines.findMany({
        where: eq(invoiceLines.invoiceId, result.serviceInvoiceId!),
      });

      expect(lines).toHaveLength(1); // Parts only

      // Verify asset status was updated to ACTIVE
      const asset = await db.query.customerAssets.findFirst({
        where: eq(customerAssets.id, testAssetId),
      });

      expect(asset?.status).toBe('ACTIVE');
      expect(asset?.installationDate).toBeDefined();
    });

    it('should handle ticket with labor only (no invoice)', async () => {
      const result = await completeServiceTicket({
        ticketId: testTicketId,
        laborHours: 1.0,
        partsUsed: [],
      });

      expect(result.success).toBe(true);
      // No invoice created for labor-only in simplified version
      expect(result.serviceInvoiceId).toBeNull();

      // Verify ticket was completed and labor recorded
      const ticket = await db.query.serviceTickets.findFirst({
        where: eq(serviceTickets.id, testTicketId),
      });

      expect(ticket?.status).toBe('COMPLETED');
      expect(ticket?.laborHoursDecimal).toBe(100); // 1.0 hour * 100
    });

    it('should not update asset status for non-installation tickets', async () => {
      // Update ticket type to REPAIR
      await db.update(serviceTickets)
        .set({ ticketType: 'REPAIR' })
        .where(eq(serviceTickets.id, testTicketId));

      // Update asset status to ACTIVE
      await db.update(customerAssets)
        .set({ status: 'ACTIVE' })
        .where(eq(customerAssets.id, testAssetId));

      await completeServiceTicket({
        ticketId: testTicketId,
        laborHours: 0.5,
      });

      const asset = await db.query.customerAssets.findFirst({
        where: eq(customerAssets.id, testAssetId),
      });

      // Status should remain ACTIVE (not changed)
      expect(asset?.status).toBe('ACTIVE');
    });

    it('should throw error for already completed ticket', async () => {
      // Complete ticket first time
      await completeServiceTicket({
        ticketId: testTicketId,
        laborHours: 1.0,
      });

      // Try to complete again
      await expect(
        completeServiceTicket({
          ticketId: testTicketId,
          laborHours: 1.0,
        })
      ).rejects.toThrow('already completed');
    });

    it('should throw error for invalid ticket', async () => {
      await expect(
        completeServiceTicket({
          ticketId: 99999,
          laborHours: 1.0,
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('4. createServiceContract()', () => {
    it('should create service contract with refill items', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      const result = await createServiceContract({
        customerId: testCustomerId,
        contractType: 'FULL_SERVICE',
        startDate,
        endDate,
        billingFrequencyMonths: 1,
        monthlyValue: 1000000, // 10,000 UZS per month
        refillItems: [
          {
            itemId: testItemId,
            quantityPerCycle: 5,
            contractUnitPrice: 100000, // 1,000 UZS
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.contractNumber).toMatch(/^AMC-\d{4}-\d{5}$/);

      // Verify contract was created
      const contract = await db.query.serviceContracts.findFirst({
        where: eq(serviceContracts.id, result.contractId),
      });

      expect(contract).toBeDefined();
      expect(contract?.status).toBe('ACTIVE');
      expect(contract?.autoGenerateRefills).toBe(true);
      expect(contract?.monthlyValue).toBe(1000000);

      // Verify next billing date is calculated correctly
      const expectedNextBilling = new Date(startDate);
      expectedNextBilling.setMonth(expectedNextBilling.getMonth() + 1);
      const actualNextBilling = new Date(contract!.nextBillingDate!);

      expect(actualNextBilling.getMonth()).toBe(expectedNextBilling.getMonth());

      // Verify refill item was added
      const refillItems = await db.query.contractRefillItems.findMany({
        where: eq(contractRefillItems.contractId, result.contractId),
      });

      expect(refillItems).toHaveLength(1);
      expect(refillItems[0].itemId).toBe(testItemId);
      expect(refillItems[0].quantityPerCycle).toBe(5);
    });

    it('should create contract without refill items', async () => {
      const result = await createServiceContract({
        customerId: testCustomerId,
        contractType: 'MAINTENANCE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingFrequencyMonths: 3, // Quarterly
        monthlyValue: 500000,
        refillItems: [],
      });

      expect(result.success).toBe(true);

      const refillItems = await db.query.contractRefillItems.findMany({
        where: eq(contractRefillItems.contractId, result.contractId),
      });

      expect(refillItems).toHaveLength(0);
    });

    it('should throw error if end date is before start date', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      await expect(
        createServiceContract({
          customerId: testCustomerId,
          contractType: 'WARRANTY',
          startDate,
          endDate,
          billingFrequencyMonths: 1,
          monthlyValue: 100000,
        })
      ).rejects.toThrow('End date must be after start date');
    });

    it('should throw error for invalid customer', async () => {
      await expect(
        createServiceContract({
          customerId: 99999,
          contractType: 'WARRANTY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          billingFrequencyMonths: 1,
          monthlyValue: 100000,
        })
      ).rejects.toThrow('Customer #99999 not found');
    });
  });

  describe('5. suspendContract()', () => {
    let testContractId: number;

    beforeEach(async () => {
      const suspendTs = Date.now() + 400;
      const [contract] = await db.insert(serviceContracts).values({
        contractNumber: `AMC-TEST-SUSPEND-${suspendTs}`,
        customerId: testCustomerId,
        contractType: 'MAINTENANCE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingFrequencyMonths: 1,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoGenerateRefills: true,
        monthlyValue: 500000,
        status: 'ACTIVE',
      }).returning();
      testContractId = contract.id;
    });

    it('should suspend active contract', async () => {
      const result = await suspendContract({
        contractId: testContractId,
        reason: 'Customer requested temporary hold',
      });

      expect(result.success).toBe(true);

      // Verify contract was suspended
      const contract = await db.query.serviceContracts.findFirst({
        where: eq(serviceContracts.id, testContractId),
      });

      expect(contract?.status).toBe('SUSPENDED');
      expect(contract?.autoGenerateRefills).toBe(false);
      expect(contract?.suspensionReason).toBe('Customer requested temporary hold');
    });

    it('should throw error for invalid contract', async () => {
      await expect(
        suspendContract({
          contractId: 99999,
          reason: 'Test',
        })
      ).rejects.toThrow('Contract #99999 not found');
    });

    it('should throw error for expired contract', async () => {
      // Expire the contract
      await db.update(serviceContracts)
        .set({ status: 'EXPIRED' })
        .where(eq(serviceContracts.id, testContractId));

      await expect(
        suspendContract({
          contractId: testContractId,
          reason: 'Test',
        })
      ).rejects.toThrow('Cannot suspend expired contract');
    });
  });

  describe('6. expireOldContracts()', () => {
    it('should expire contracts past end date', async () => {
      // Create expired contract (end date in past)
      const expireTs = Date.now() + 500;
      const [expiredContract] = await db.insert(serviceContracts).values({
        contractNumber: `AMC-EXPIRED-${expireTs}`,
        customerId: testCustomerId,
        contractType: 'WARRANTY',
        startDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
        endDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (expired)
        billingFrequencyMonths: 12,
        monthlyValue: 0,
        status: 'ACTIVE',
        autoGenerateRefills: false,
      }).returning();

      // Create active contract (not expired)
      await db.insert(serviceContracts).values({
        contractNumber: `AMC-ACTIVE-${expireTs + 1}`,
        customerId: testCustomerId,
        contractType: 'MAINTENANCE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Future
        billingFrequencyMonths: 1,
        monthlyValue: 100000,
        status: 'ACTIVE',
        autoGenerateRefills: true,
      });

      const result = await expireOldContracts();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(1);

      // Verify expired contract status was updated
      const contract = await db.query.serviceContracts.findFirst({
        where: eq(serviceContracts.id, expiredContract.id),
      });

      expect(contract?.status).toBe('EXPIRED');
      expect(contract?.autoGenerateRefills).toBe(false);
    });

    it('should return zero when no contracts to expire', async () => {
      // Create only active contract with future end date
      const futureTs = Date.now() + 600;
      await db.insert(serviceContracts).values({
        contractNumber: `AMC-FUTURE-${futureTs}`,
        customerId: testCustomerId,
        contractType: 'MAINTENANCE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingFrequencyMonths: 1,
        monthlyValue: 100000,
        status: 'ACTIVE',
        autoGenerateRefills: true,
      });

      const result = await expireOldContracts();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(0);
    });

    it('should not affect already expired contracts', async () => {
      // Create already expired contract
      const alreadyTs = Date.now() + 700;
      await db.insert(serviceContracts).values({
        contractNumber: `AMC-ALREADY-EXPIRED-${alreadyTs}`,
        customerId: testCustomerId,
        contractType: 'WARRANTY',
        startDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        billingFrequencyMonths: 12,
        monthlyValue: 0,
        status: 'EXPIRED', // Already expired
        autoGenerateRefills: false,
      });

      const result = await expireOldContracts();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(0); // Should not count already expired
    });
  });
});
