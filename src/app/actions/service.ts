'use server';

import { db } from '../../../db';
import {
  customerAssets,
  serviceContracts,
  contractRefillItems,
  serviceTickets,
  serviceTicketAssets,
} from '../../../db/schema/service';
import { invoices, invoiceLines, customers } from '../../../db/schema/sales';
import { items } from '../../../db/schema/inventory';
import { journalEntries, journalEntryLines } from '../../../db/schema/finance';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '../../../src/auth';
import { checkPeriodLock } from './finance';
import { ACCOUNTS } from '../../../src/lib/accounting-config';

// --- Constants ---
const LABOR_RATE_TIYIN = 50000; // 500 UZS per hour

// --- Input Validation Schemas ---

const createInstallationTicketSchema = z.object({
  invoiceId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  machineInvoiceLines: z.array(z.object({
    invoiceLineId: z.number().int().positive(),
    itemId: z.number().int().positive(),
    serialNumber: z.string().optional(),
    installationAddress: z.string().optional(),
  })).min(1),
});

const createServiceContractSchema = z.object({
  customerId: z.number().int().positive(),
  contractType: z.enum(['WARRANTY', 'MAINTENANCE', 'FULL_SERVICE', 'SUPPLIES_ONLY']),
  startDate: z.date(),
  endDate: z.date(),
  billingFrequencyMonths: z.number().int().positive(),
  monthlyValue: z.number().int().positive(), // In Tiyin
  sourceInvoiceId: z.number().int().positive().optional(),
  refillItems: z.array(z.object({
    itemId: z.number().int().positive(),
    quantityPerCycle: z.number().int().positive(),
    contractUnitPrice: z.number().int().positive(), // In Tiyin
  })).default([]),
});

const completeServiceTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  completionNotes: z.string().optional(),
  laborHours: z.number().positive(), // Decimal hours (e.g., 2.5)
  partsUsed: z.array(z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitCost: z.number().int().positive(), // In Tiyin
  })).default([]),
  customerSignature: z.string().optional(),
});

const suspendContractSchema = z.object({
  contractId: z.number().int().positive(),
  reason: z.string().min(1),
  suspendUntil: z.date().optional(),
});

// --- Helper Functions ---

/**
 * Generates unique ticket number in format TKT-YYYY-#####
 */
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

/**
 * Generates unique asset number in format CA-YYYY-#####
 */
async function generateAssetNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Count all assets with this year prefix to get next sequence
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customerAssets)
    .where(sql`${customerAssets.assetNumber} LIKE ${`CA-${year}-%`}`);

  const sequence = (result[0]?.count || 0) + 1;

  return `CA-${year}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Generates unique contract number in format AMC-YYYY-#####
 */
async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existingContracts = await db
    .select({ contractNumber: serviceContracts.contractNumber })
    .from(serviceContracts)
    .where(sql`${serviceContracts.contractNumber} LIKE ${`AMC-${year}-%`}`)
    .orderBy(desc(serviceContracts.contractNumber))
    .limit(1);

  const lastNumber = existingContracts[0]?.contractNumber;
  let sequence = 1;

  if (lastNumber) {
    const match = lastNumber.match(/AMC-\d{4}-(\d{5})/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `AMC-${year}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Generates unique refill invoice number in format SO-REFILL-YYYY-#####
 */
async function generateRefillInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existingInvoices = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} LIKE ${`SO-REFILL-${year}-%`}`)
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  const lastNumber = existingInvoices[0]?.invoiceNumber;
  let sequence = 1;

  if (lastNumber) {
    const match = lastNumber.match(/SO-REFILL-\d{4}-(\d{5})/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `SO-REFILL-${year}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Generates unique service invoice number in format SVC-INV-YYYY-#####
 */
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

// --- Server Actions ---

/**
 * 1. createInstallationTicket()
 * Auto-create installation ticket when machine sold
 */
export async function createInstallationTicket(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createInstallationTicketSchema.parse(input);

  // Verify invoice exists
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, validated.invoiceId),
  });

  if (!invoice) {
    throw new Error(`Invoice #${validated.invoiceId} not found`);
  }

  return await db.transaction(async (tx) => {
    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create service ticket
    const [ticket] = await tx.insert(serviceTickets).values({
      ticketNumber,
      customerId: validated.customerId,
      ticketType: 'INSTALLATION',
      priority: 'MEDIUM',
      title: `Installation for Invoice ${invoice.invoiceNumber}`,
      description: `Auto-generated installation ticket for equipment sale`,
      status: 'OPEN',
      isBillable: false,
      laborHoursDecimal: 0,
      sourceInvoiceId: validated.invoiceId,
    }).returning();

    // Create customer assets and link to ticket
    const assetIds: number[] = [];

    // Get starting sequence for asset numbers (do this once before loop)
    const year = new Date().getFullYear();
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customerAssets)
      .where(sql`${customerAssets.assetNumber} LIKE ${`CA-${year}-%`}`);
    let assetSequence = (result[0]?.count || 0) + 1;

    for (const line of validated.machineInvoiceLines) {
      // Generate asset number with incrementing sequence
      const assetNumber = `CA-${year}-${String(assetSequence).padStart(5, '0')}`;
      assetSequence++;

      // Create customer asset
      const [asset] = await tx.insert(customerAssets).values({
        assetNumber,
        customerId: validated.customerId,
        itemId: line.itemId,
        serialNumber: line.serialNumber,
        installationAddress: line.installationAddress,
        invoiceLineId: line.invoiceLineId,
        status: 'PENDING_INSTALLATION',
      }).returning();

      assetIds.push(asset.id);

      // Create junction record (ticket -> asset)
      await tx.insert(serviceTicketAssets).values({
        ticketId: ticket.id,
        assetId: asset.id,
        notes: `Installation pending for ${assetNumber}`,
      });
    }

    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      assetIds,
    };
  });
}

/**
 * 2. generateRecurringRefills()
 * Generate refill sales orders for due service contracts
 * @param skipAuth - Set to true when called from cron jobs (no user session available)
 */
export async function generateRecurringRefills(skipAuth = false) {
  if (!skipAuth) {
    const session = await auth();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
  }

  const currentDate = new Date();

  // Query contracts due for refill
  const dueContracts = await db.query.serviceContracts.findMany({
    where: and(
      eq(serviceContracts.status, 'ACTIVE'),
      eq(serviceContracts.autoGenerateRefills, true),
      lte(serviceContracts.nextBillingDate, currentDate)
    ),
    with: {
      customer: true,
      refillItems: {
        with: {
          item: true,
        },
      },
    },
  });

  const results = {
    total: dueContracts.length,
    success: 0,
    skipped: 0,
    errors: [] as Array<{ contractId: number; contractNumber: string; error: string }>,
  };

  for (const contract of dueContracts) {
    try {
      // Validate contract has refill items
      if (!contract.refillItems || contract.refillItems.length === 0) {
        results.skipped++;
        results.errors.push({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          error: 'No refill items configured',
        });
        continue;
      }

      // Check period lock
      await checkPeriodLock(currentDate);

      await db.transaction(async (tx) => {
        // Generate invoice number
        const invoiceNumber = await generateRefillInvoiceNumber();

        // Calculate totals
        let subtotal = 0;
        const lines = contract.refillItems.map(refillItem => {
          const lineAmount = refillItem.quantityPerCycle * refillItem.contractUnitPrice;
          subtotal += lineAmount;
          return {
            itemId: refillItem.itemId,
            quantity: refillItem.quantityPerCycle,
            rate: refillItem.contractUnitPrice,
            amount: lineAmount,
            description: `Auto-refill - Contract ${contract.contractNumber}`,
            revenueAccountId: null, // Use default account
          };
        });

        const taxTotal = 0; // No tax for now (can be enhanced later)
        const totalAmount = subtotal + taxTotal;

        // Create invoice
        const [newInvoice] = await tx.insert(invoices).values({
          customerId: contract.customerId,
          date: currentDate,
          dueDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          invoiceNumber,
          subtotal,
          taxTotal,
          totalAmount,
          balanceRemaining: totalAmount,
          status: 'OPEN',
        }).returning();

        // Create invoice lines
        await tx.insert(invoiceLines).values(
          lines.map(line => ({
            invoiceId: newInvoice.id,
            itemId: line.itemId,
            quantity: line.quantity,
            rate: line.rate,
            amount: line.amount,
            description: line.description,
            revenueAccountId: line.revenueAccountId,
          }))
        );

        // Create GL entries (Double Entry)
        const [je] = await tx.insert(journalEntries).values({
          date: currentDate,
          description: `Auto-refill Invoice ${invoiceNumber} - Contract ${contract.contractNumber}`,
          reference: invoiceNumber,
          isPosted: true,
        }).returning();

        // Debit AR (1200)
        await tx.insert(journalEntryLines).values({
          journalEntryId: je.id,
          accountCode: ACCOUNTS.AR,
          debit: totalAmount,
          credit: 0,
          description: `Auto-refill Invoice ${invoiceNumber} - Customer #${contract.customerId}`,
        });

        // Credit Sales Revenue (4000)
        await tx.insert(journalEntryLines).values({
          journalEntryId: je.id,
          accountCode: '4000', // Sales Revenue
          debit: 0,
          credit: subtotal,
          description: `Refill Revenue - Contract ${contract.contractNumber}`,
        });

        // Update next billing date
        const nextBillingDate = new Date(contract.nextBillingDate!);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + contract.billingFrequencyMonths);

        await tx.update(serviceContracts)
          .set({ nextBillingDate })
          .where(eq(serviceContracts.id, contract.id));
      });

      results.success++;
    } catch (error: any) {
      results.errors.push({
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        error: error.message || 'Unknown error',
      });
    }
  }

  return {
    success: true,
    results,
  };
}

/**
 * 3. completeServiceTicket()
 * Close ticket and create service invoice
 */
export async function completeServiceTicket(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = completeServiceTicketSchema.parse(input);

  // Fetch ticket with relations
  const ticket = await db.query.serviceTickets.findFirst({
    where: eq(serviceTickets.id, validated.ticketId),
    with: {
      ticketAssets: {
        with: {
          asset: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error(`Service ticket #${validated.ticketId} not found`);
  }

  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
    throw new Error(`Ticket ${ticket.ticketNumber} is already ${ticket.status.toLowerCase()}`);
  }

  const currentDate = new Date();
  await checkPeriodLock(currentDate);

  return await db.transaction(async (tx) => {
    // Calculate labor cost
    const laborHoursDecimal = Math.round(validated.laborHours * 100); // Store as integer * 100
    const laborCost = Math.round(validated.laborHours * LABOR_RATE_TIYIN);

    // Calculate parts cost
    const partsCost = validated.partsUsed.reduce(
      (sum, part) => sum + part.quantity * part.unitCost,
      0
    );

    const totalAmount = laborCost + partsCost;

    // Create service invoice only if there are parts (with items)
    // NOTE: Labor-only service is tracked in the ticket but not invoiced separately
    // This is a simplified approach - in production, you'd create a SERVICE type item for labor
    let serviceInvoiceId: number | null = null;

    if (ticket.isBillable && validated.partsUsed.length > 0) {
      const invoiceNumber = await generateServiceInvoiceNumber();

      const taxTotal = 0; // No tax for now
      const subtotal = partsCost; // Only invoice parts for now

      const [newInvoice] = await tx.insert(invoices).values({
        customerId: ticket.customerId,
        date: currentDate,
        dueDate: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        invoiceNumber,
        subtotal,
        taxTotal,
        totalAmount: subtotal + taxTotal,
        balanceRemaining: subtotal + taxTotal,
        status: 'OPEN',
      }).returning();

      serviceInvoiceId = newInvoice.id;

      // Create invoice lines for parts only
      const partsLineRecords = validated.partsUsed.map(part => ({
        invoiceId: newInvoice.id,
        itemId: part.itemId,
        quantity: part.quantity,
        rate: part.unitCost,
        amount: part.quantity * part.unitCost,
        description: `Service Parts - Ticket ${ticket.ticketNumber}`,
        revenueAccountId: null,
      }));

      await tx.insert(invoiceLines).values(partsLineRecords);

      // Create GL entries (Double Entry) for parts invoice
      const [je] = await tx.insert(journalEntries).values({
        date: currentDate,
        description: `Service Invoice ${invoiceNumber} - Ticket ${ticket.ticketNumber}`,
        reference: invoiceNumber,
        isPosted: true,
      }).returning();

      // Debit AR (1200)
      await tx.insert(journalEntryLines).values({
        journalEntryId: je.id,
        accountCode: ACCOUNTS.AR,
        debit: subtotal,
        credit: 0,
        description: `Service Invoice ${invoiceNumber} - Customer #${ticket.customerId}`,
      });

      // Credit Service Revenue (4000)
      await tx.insert(journalEntryLines).values({
        journalEntryId: je.id,
        accountCode: '4000', // Sales Revenue
        debit: 0,
        credit: subtotal,
        description: `Service Revenue (Parts) - Ticket ${ticket.ticketNumber}`,
      });
    }

    // Update ticket status
    await tx.update(serviceTickets)
      .set({
        status: 'COMPLETED',
        actualEndTime: currentDate,
        completionNotes: validated.completionNotes,
        laborHoursDecimal,
        partsUsed: validated.partsUsed as Array<{ itemId: number; quantity: number; unitCost: number }>,
        customerSignature: validated.customerSignature,
        serviceInvoiceId,
      })
      .where(eq(serviceTickets.id, validated.ticketId));

    // Update asset status to ACTIVE if this was an installation ticket
    if (ticket.ticketType === 'INSTALLATION' && ticket.ticketAssets.length > 0) {
      const assetIds = ticket.ticketAssets.map(ta => ta.assetId);
      for (const assetId of assetIds) {
        await tx.update(customerAssets)
          .set({
            status: 'ACTIVE',
            installationDate: currentDate,
          })
          .where(eq(customerAssets.id, assetId));
      }
    }

    return {
      success: true,
      ticketId: validated.ticketId,
      serviceInvoiceId,
    };
  });
}

/**
 * 4. createServiceContract()
 * Create new service contract
 */
export async function createServiceContract(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createServiceContractSchema.parse(input);

  // Validate dates
  if (validated.endDate <= validated.startDate) {
    throw new Error('End date must be after start date');
  }

  // Verify customer exists
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, validated.customerId),
  });

  if (!customer) {
    throw new Error(`Customer #${validated.customerId} not found`);
  }

  return await db.transaction(async (tx) => {
    // Generate contract number
    const contractNumber = await generateContractNumber();

    // Calculate next billing date
    const nextBillingDate = new Date(validated.startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + validated.billingFrequencyMonths);

    // Create contract
    const [contract] = await tx.insert(serviceContracts).values({
      contractNumber,
      customerId: validated.customerId,
      contractType: validated.contractType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      billingFrequencyMonths: validated.billingFrequencyMonths,
      nextBillingDate,
      autoGenerateRefills: true,
      monthlyValue: validated.monthlyValue,
      status: 'ACTIVE',
      sourceInvoiceId: validated.sourceInvoiceId,
    }).returning();

    // Insert refill items if provided
    if (validated.refillItems.length > 0) {
      await tx.insert(contractRefillItems).values(
        validated.refillItems.map(item => ({
          contractId: contract.id,
          itemId: item.itemId,
          quantityPerCycle: item.quantityPerCycle,
          contractUnitPrice: item.contractUnitPrice,
        }))
      );
    }

    return {
      success: true,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
    };
  });
}

/**
 * 5. suspendContract()
 * Temporarily halt auto-refill
 */
export async function suspendContract(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = suspendContractSchema.parse(input);

  // Verify contract exists
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, validated.contractId),
  });

  if (!contract) {
    throw new Error(`Contract #${validated.contractId} not found`);
  }

  if (contract.status === 'EXPIRED' || contract.status === 'CANCELLED') {
    throw new Error(`Cannot suspend ${contract.status.toLowerCase()} contract`);
  }

  // Update contract status
  await db.update(serviceContracts)
    .set({
      status: 'SUSPENDED',
      autoGenerateRefills: false,
      suspensionReason: validated.reason,
    })
    .where(eq(serviceContracts.id, validated.contractId));

  return {
    success: true,
  };
}

/**
 * 6. expireOldContracts()
 * Auto-expire contracts past end date
 */
export async function expireOldContracts() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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

  if (expiredContracts.length === 0) {
    return {
      success: true,
      expiredCount: 0,
    };
  }

  // Update contracts to EXPIRED status
  const contractIds = expiredContracts.map(c => c.id);

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

  return {
    success: true,
    expiredCount: expiredContracts.length,
  };
}
