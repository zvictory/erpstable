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

const renewContractSchema = z.object({
  contractId: z.number().int().positive(),
  newEndDate: z.date(),
});

const cancelContractSchema = z.object({
  contractId: z.number().int().positive(),
  reason: z.string().min(1),
});

const updateServiceContractSchema = z.object({
  id: z.number().int().positive(),
  endDate: z.date().optional(),
  monthlyValue: z.number().int().positive().optional(),
  billingFrequencyMonths: z.number().int().positive().optional(),
});

const createServiceTicketSchema = z.object({
  customerId: z.number().int().positive(),
  serviceContractId: z.number().int().positive().optional(),
  ticketType: z.enum(['INSTALLATION', 'REPAIR', 'MAINTENANCE', 'SUPPORT', 'EMERGENCY']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.date().optional(),
  assignedTechnicianId: z.number().int().positive().optional(),
  assetIds: z.array(z.number().int().positive()).default([]),
});

const updateServiceTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  assignedTechnicianId: z.number().int().positive().optional(),
  scheduledDate: z.date().optional(),
  status: z.enum(['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  actualStartTime: z.date().optional(),
});

const cancelServiceTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  reason: z.string().min(1),
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

// --- Dashboard Data Actions ---

/**
 * 7. getServiceDashboardKPIs()
 * Returns key performance indicators for the service dashboard
 */
export async function getServiceDashboardKPIs() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const currentDate = new Date();

  // Count open tickets (OPEN, SCHEDULED, IN_PROGRESS)
  const openTicketsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceTickets)
    .where(
      sql`${serviceTickets.status} IN ('OPEN', 'SCHEDULED', 'IN_PROGRESS')`
    );

  // Count pending installations
  const pendingInstallationsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceTickets)
    .where(
      and(
        eq(serviceTickets.ticketType, 'INSTALLATION'),
        sql`${serviceTickets.status} != 'COMPLETED'`
      )
    );

  // Count active contracts
  const activeContractsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceContracts)
    .where(eq(serviceContracts.status, 'ACTIVE'));

  // Count refills due (contracts with nextBillingDate <= current date)
  const refillsDueResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceContracts)
    .where(
      and(
        eq(serviceContracts.status, 'ACTIVE'),
        eq(serviceContracts.autoGenerateRefills, true),
        lte(serviceContracts.nextBillingDate, currentDate)
      )
    );

  return {
    openTickets: openTicketsResult[0]?.count || 0,
    pendingInstallations: pendingInstallationsResult[0]?.count || 0,
    activeContracts: activeContractsResult[0]?.count || 0,
    refillsDue: refillsDueResult[0]?.count || 0,
  };
}

/**
 * 8. getRecentServiceTickets()
 * Returns recent service tickets for dashboard display
 */
export async function getRecentServiceTickets(limit = 10) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const tickets = await db.query.serviceTickets.findMany({
    limit,
    orderBy: desc(serviceTickets.createdAt),
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return tickets;
}

/**
 * 9. getUpcomingServiceTickets()
 * Returns scheduled tickets for the next N days
 */
export async function getUpcomingServiceTickets(days = 7) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const currentDate = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const tickets = await db.query.serviceTickets.findMany({
    where: and(
      sql`${serviceTickets.scheduledDate} IS NOT NULL`,
      sql`${serviceTickets.scheduledDate} >= ${currentDate.getTime()}`,
      sql`${serviceTickets.scheduledDate} <= ${futureDate.getTime()}`,
      sql`${serviceTickets.status} != 'COMPLETED'`,
      sql`${serviceTickets.status} != 'CANCELLED'`
    ),
    orderBy: [serviceTickets.scheduledDate],
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
        },
      },
      ticketAssets: {
        with: {
          asset: {
            with: {
              item: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return tickets;
}

// --- Contract Management Actions ---

/**
 * 10. getServiceContracts()
 * List all contracts with optional status filter
 */
export async function getServiceContracts(statusFilter?: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const contracts = await db.query.serviceContracts.findMany({
    where: statusFilter ? eq(serviceContracts.status, statusFilter as any) : undefined,
    orderBy: desc(serviceContracts.createdAt),
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
        },
      },
      refillItems: {
        with: {
          item: {
            columns: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  return contracts;
}

/**
 * 11. getServiceContract()
 * Get single contract with all relations
 */
export async function getServiceContract(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, id),
    with: {
      customer: true,
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      sourceInvoice: {
        columns: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
        },
      },
      refillItems: {
        with: {
          item: true,
        },
      },
      serviceTickets: {
        orderBy: desc(serviceTickets.createdAt),
        with: {
          assignedTechnician: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
      customerAssets: {
        with: {
          item: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!contract) {
    throw new Error(`Contract #${id} not found`);
  }

  return contract;
}

/**
 * 12. getContractRefillItems()
 * Get refill items for a contract
 */
export async function getContractRefillItems(contractId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const refillItems = await db.query.contractRefillItems.findMany({
    where: eq(contractRefillItems.contractId, contractId),
    with: {
      item: true,
    },
  });

  return refillItems;
}

/**
 * 13. getContractBillingHistory()
 * Get generated invoices for a contract
 */
export async function getContractBillingHistory(contractId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get contract to find customer
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, contractId),
  });

  if (!contract) {
    throw new Error(`Contract #${contractId} not found`);
  }

  // Query invoices with invoice numbers starting with "SO-REFILL-"
  // and matching customer
  const billingHistory = await db.query.invoices.findMany({
    where: and(
      eq(invoices.customerId, contract.customerId),
      sql`${invoices.invoiceNumber} LIKE 'SO-REFILL-%'`
    ),
    orderBy: desc(invoices.date),
    with: {
      lines: {
        with: {
          item: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return billingHistory;
}

/**
 * 14. getContractTickets()
 * Get associated tickets for a contract
 */
export async function getContractTickets(contractId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const tickets = await db.query.serviceTickets.findMany({
    where: eq(serviceTickets.serviceContractId, contractId),
    orderBy: desc(serviceTickets.createdAt),
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return tickets;
}

/**
 * 15. renewContract()
 * Renew contract by updating end date and reactivating if needed
 */
export async function renewContract(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = renewContractSchema.parse(input);

  // Verify contract exists
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, validated.contractId),
  });

  if (!contract) {
    throw new Error(`Contract #${validated.contractId} not found`);
  }

  // Validate new end date is after start date
  if (validated.newEndDate <= contract.startDate) {
    throw new Error('New end date must be after start date');
  }

  // Update contract
  await db.update(serviceContracts)
    .set({
      endDate: validated.newEndDate,
      status: 'ACTIVE',
      autoGenerateRefills: true,
      suspensionReason: null,
    })
    .where(eq(serviceContracts.id, validated.contractId));

  return {
    success: true,
  };
}

/**
 * 16. cancelContract()
 * Cancel contract permanently
 */
export async function cancelContract(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = cancelContractSchema.parse(input);

  // Verify contract exists
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, validated.contractId),
  });

  if (!contract) {
    throw new Error(`Contract #${validated.contractId} not found`);
  }

  if (contract.status === 'CANCELLED') {
    throw new Error('Contract is already cancelled');
  }

  // Update contract status
  await db.update(serviceContracts)
    .set({
      status: 'CANCELLED',
      autoGenerateRefills: false,
      suspensionReason: validated.reason,
    })
    .where(eq(serviceContracts.id, validated.contractId));

  return {
    success: true,
  };
}

/**
 * 17. updateServiceContract()
 * Update contract details (limited fields based on status)
 */
export async function updateServiceContract(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = updateServiceContractSchema.parse(input);

  // Verify contract exists and is ACTIVE
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, validated.id),
  });

  if (!contract) {
    throw new Error(`Contract #${validated.id} not found`);
  }

  if (contract.status !== 'ACTIVE') {
    throw new Error(`Cannot edit ${contract.status.toLowerCase()} contract`);
  }

  // Validate end date if provided
  if (validated.endDate && validated.endDate <= contract.startDate) {
    throw new Error('End date must be after start date');
  }

  // Build update object
  const updates: any = {};
  if (validated.endDate) updates.endDate = validated.endDate;
  if (validated.monthlyValue) updates.monthlyValue = validated.monthlyValue;
  if (validated.billingFrequencyMonths) {
    updates.billingFrequencyMonths = validated.billingFrequencyMonths;
    // Recalculate next billing date
    const nextBillingDate = new Date(contract.startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + validated.billingFrequencyMonths);
    updates.nextBillingDate = nextBillingDate;
  }

  // Update contract
  await db.update(serviceContracts)
    .set(updates)
    .where(eq(serviceContracts.id, validated.id));

  return {
    success: true,
  };
}

/**
 * 18. updateContractRefillItems()
 * Update refill items for ACTIVE contract
 */
export async function updateContractRefillItems(
  contractId: number,
  refillItems: Array<{
    itemId: number;
    quantityPerCycle: number;
    contractUnitPrice: number;
  }>
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify contract exists and is ACTIVE
  const contract = await db.query.serviceContracts.findFirst({
    where: eq(serviceContracts.id, contractId),
  });

  if (!contract) {
    throw new Error(`Contract #${contractId} not found`);
  }

  if (contract.status !== 'ACTIVE') {
    throw new Error(`Cannot edit refill items for ${contract.status.toLowerCase()} contract`);
  }

  // Use transaction to replace all items
  await db.transaction(async (tx) => {
    // Delete existing items
    await tx.delete(contractRefillItems)
      .where(eq(contractRefillItems.contractId, contractId));

    // Insert new items
    if (refillItems.length > 0) {
      await tx.insert(contractRefillItems).values(
        refillItems.map(item => ({
          contractId,
          itemId: item.itemId,
          quantityPerCycle: item.quantityPerCycle,
          contractUnitPrice: item.contractUnitPrice,
        }))
      );
    }
  });

  return {
    success: true,
  };
}

// --- Ticket Management Actions ---

/**
 * 19. getServiceTickets()
 * List all tickets with optional filters
 */
export async function getServiceTickets(filters?: {
  status?: string;
  ticketType?: string;
  priority?: string;
  technicianId?: number;
  customerId?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Build dynamic WHERE conditions
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(serviceTickets.status, filters.status as any));
  }
  if (filters?.ticketType) {
    conditions.push(eq(serviceTickets.ticketType, filters.ticketType as any));
  }
  if (filters?.priority) {
    conditions.push(eq(serviceTickets.priority, filters.priority as any));
  }
  if (filters?.technicianId) {
    conditions.push(eq(serviceTickets.assignedTechnicianId, filters.technicianId));
  }
  if (filters?.customerId) {
    conditions.push(eq(serviceTickets.customerId, filters.customerId));
  }

  const tickets = await db.query.serviceTickets.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(serviceTickets.createdAt),
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
        },
      },
      contract: {
        columns: {
          id: true,
          contractNumber: true,
        },
      },
      ticketAssets: {
        with: {
          asset: {
            with: {
              item: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return tickets;
}

/**
 * 20. getServiceTicket()
 * Get single ticket with all relations
 */
export async function getServiceTicket(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const ticket = await db.query.serviceTickets.findFirst({
    where: eq(serviceTickets.id, id),
    with: {
      customer: true,
      contract: {
        columns: {
          id: true,
          contractNumber: true,
          contractType: true,
          status: true,
        },
      },
      assignedTechnician: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      sourceInvoice: {
        columns: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
        },
      },
      serviceInvoice: {
        columns: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
        },
      },
      ticketAssets: {
        with: {
          asset: {
            with: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new Error(`Service ticket #${id} not found`);
  }

  return ticket;
}

/**
 * 21. createServiceTicket()
 * Create a new service ticket manually
 */
export async function createServiceTicket(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createServiceTicketSchema.parse(input);

  // Verify customer exists
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, validated.customerId),
  });

  if (!customer) {
    throw new Error(`Customer #${validated.customerId} not found`);
  }

  // Verify contract exists if provided
  if (validated.serviceContractId) {
    const contract = await db.query.serviceContracts.findFirst({
      where: eq(serviceContracts.id, validated.serviceContractId),
    });

    if (!contract) {
      throw new Error(`Service contract #${validated.serviceContractId} not found`);
    }
  }

  return await db.transaction(async (tx) => {
    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create service ticket
    const [ticket] = await tx.insert(serviceTickets).values({
      ticketNumber,
      customerId: validated.customerId,
      serviceContractId: validated.serviceContractId,
      ticketType: validated.ticketType,
      priority: validated.priority,
      title: validated.title,
      description: validated.description,
      scheduledDate: validated.scheduledDate,
      assignedTechnicianId: validated.assignedTechnicianId,
      status: validated.assignedTechnicianId && validated.scheduledDate ? 'SCHEDULED' : 'OPEN',
      isBillable: validated.ticketType !== 'INSTALLATION',
      laborHoursDecimal: 0,
    }).returning();

    // Link assets to ticket if provided
    if (validated.assetIds.length > 0) {
      await tx.insert(serviceTicketAssets).values(
        validated.assetIds.map(assetId => ({
          ticketId: ticket.id,
          assetId,
          notes: `Linked to ticket ${ticketNumber}`,
        }))
      );
    }

    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    };
  });
}

/**
 * 22. updateServiceTicket()
 * Update ticket (assign technician, schedule, change status, etc.)
 */
export async function updateServiceTicket(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = updateServiceTicketSchema.parse(input);

  // Verify ticket exists
  const ticket = await db.query.serviceTickets.findFirst({
    where: eq(serviceTickets.id, validated.ticketId),
  });

  if (!ticket) {
    throw new Error(`Service ticket #${validated.ticketId} not found`);
  }

  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
    throw new Error(`Cannot update ${ticket.status.toLowerCase()} ticket`);
  }

  // Build update object
  const updates: any = {};
  if (validated.assignedTechnicianId !== undefined) {
    updates.assignedTechnicianId = validated.assignedTechnicianId;
  }
  if (validated.scheduledDate !== undefined) {
    updates.scheduledDate = validated.scheduledDate;
  }
  if (validated.status !== undefined) {
    updates.status = validated.status;
  }
  if (validated.actualStartTime !== undefined) {
    updates.actualStartTime = validated.actualStartTime;
  }

  // Auto-update status based on changes
  if (validated.status === 'IN_PROGRESS' && !validated.actualStartTime) {
    updates.actualStartTime = new Date();
  }
  if (validated.assignedTechnicianId && validated.scheduledDate && ticket.status === 'OPEN') {
    updates.status = 'SCHEDULED';
  }

  // Update ticket
  await db.update(serviceTickets)
    .set(updates)
    .where(eq(serviceTickets.id, validated.ticketId));

  return {
    success: true,
  };
}

/**
 * 23. cancelServiceTicket()
 * Cancel a service ticket
 */
export async function cancelServiceTicket(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = cancelServiceTicketSchema.parse(input);

  // Verify ticket exists
  const ticket = await db.query.serviceTickets.findFirst({
    where: eq(serviceTickets.id, validated.ticketId),
  });

  if (!ticket) {
    throw new Error(`Service ticket #${validated.ticketId} not found`);
  }

  if (ticket.status === 'COMPLETED') {
    throw new Error('Cannot cancel completed ticket');
  }

  if (ticket.status === 'CANCELLED') {
    throw new Error('Ticket is already cancelled');
  }

  // Update ticket status
  await db.update(serviceTickets)
    .set({
      status: 'CANCELLED',
      completionNotes: `Cancelled: ${validated.reason}`,
    })
    .where(eq(serviceTickets.id, validated.ticketId));

  return {
    success: true,
  };
}

/**
 * 24. getTechnicians()
 * Get list of technicians (users who can be assigned to tickets)
 */
export async function getTechnicians() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const technicians = await db.query.users.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: (users, { asc }) => [asc(users.name)],
  });

  return technicians;
}
