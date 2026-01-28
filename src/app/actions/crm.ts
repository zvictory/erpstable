'use server';

import { auth } from '../../../src/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq, desc, and, or, gte, lte, isNull } from 'drizzle-orm';
import { leads, opportunities, customers, invoices } from '../../../db/schema';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const createLeadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  company: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'PARTNER', 'OTHER']).default('OTHER'),
  estimatedValue: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  assignedToUserId: z.number().int().positive().optional(),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']).optional(),
});

const convertLeadToCustomerSchema = z.object({
  leadId: z.number().int().positive(),
  customerData: z.object({
    name: z.string().min(1),
    taxId: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    creditLimit: z.number().int().min(0).default(0),
  }),
  createOpportunity: z.boolean().default(false),
  opportunityData: z.object({
    title: z.string().min(1),
    estimatedValue: z.number().int().min(0),
    probability: z.number().int().min(0).max(100).default(50),
    description: z.string().optional(),
  }).optional(),
});

const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customerId: z.number().int().positive(),
  estimatedValue: z.number().int().min(0),
  probability: z.number().int().min(0).max(100).default(50),
  expectedCloseDate: z.date().optional(),
  description: z.string().optional(),
  nextAction: z.string().optional(),
  assignedToUserId: z.number().int().positive().optional(),
  leadId: z.number().int().positive().optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  lostReason: z.string().optional(),
});

const createQuoteFromOpportunitySchema = z.object({
  opportunityId: z.number().int().positive(),
  date: z.date().default(() => new Date()),
  dueDate: z.date(),
  validUntil: z.date(),
  lines: z.array(z.object({
    itemId: z.number().int().positive(),
    description: z.string().optional(),
    quantity: z.number().int().positive(),
    rate: z.number().int().min(0),
  })).min(1, 'At least one line item is required'),
});

const convertQuoteToSalesOrderSchema = z.object({
  quoteId: z.number().int().positive(),
  salesOrderDate: z.date().default(() => new Date()),
  salesOrderDueDate: z.date().optional(),
});

// ============================================================================
// LEAD ACTIONS
// ============================================================================

export async function createLead(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createLeadSchema.parse(input);

  const [newLead] = await db.insert(leads).values({
    ...validated,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  revalidatePath('/sales/leads');
  return { success: true, data: newLead };
}

export async function updateLead(id: number, input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = updateLeadSchema.parse(input);

  const [updated] = await db.update(leads)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();

  revalidatePath('/sales/leads');
  revalidatePath(`/sales/leads/${id}`);
  return { success: true, data: updated };
}

export async function updateLeadStatus(id: number, status: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validStatus = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']).parse(status);

  const [updated] = await db.update(leads)
    .set({
      status: validStatus,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();

  revalidatePath('/sales/leads');
  revalidatePath(`/sales/leads/${id}`);
  return { success: true, data: updated };
}

export async function getLeads(filters?: {
  status?: string;
  assignedToUserId?: number;
  source?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as any));
  }
  if (filters?.assignedToUserId) {
    conditions.push(eq(leads.assignedToUserId, filters.assignedToUserId));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source as any));
  }

  const results = await db.query.leads.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      assignedToUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      convertedToCustomer: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: desc(leads.createdAt),
  });

  return results;
}

export async function getLead(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      assignedToUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      convertedToCustomer: true,
      opportunities: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  return lead;
}

// ============================================================================
// CONVERSION WORKFLOWS
// ============================================================================

export async function convertLeadToCustomer(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = convertLeadToCustomerSchema.parse(input);

  // Start transaction
  const [lead] = await db.select().from(leads).where(eq(leads.id, validated.leadId));

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.status === 'CONVERTED') {
    throw new Error('Lead already converted');
  }

  // 1. Create customer
  const [newCustomer] = await db.insert(customers).values({
    ...validated.customerData,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // 2. Update lead status
  const [updatedLead] = await db.update(leads)
    .set({
      status: 'CONVERTED',
      convertedToCustomerId: newCustomer.id,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, validated.leadId))
    .returning();

  // 3. Optionally create opportunity
  let newOpportunity = null;
  if (validated.createOpportunity && validated.opportunityData) {
    [newOpportunity] = await db.insert(opportunities).values({
      title: validated.opportunityData.title,
      customerId: newCustomer.id,
      estimatedValue: validated.opportunityData.estimatedValue,
      probability: validated.opportunityData.probability,
      description: validated.opportunityData.description,
      stage: 'QUALIFIED',
      leadId: validated.leadId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  revalidatePath('/sales/leads');
  revalidatePath(`/sales/leads/${validated.leadId}`);
  revalidatePath('/sales/customers');
  if (newOpportunity) {
    revalidatePath('/sales/pipeline');
    revalidatePath('/sales/opportunities');
  }

  return {
    success: true,
    data: {
      customer: newCustomer,
      lead: updatedLead,
      opportunity: newOpportunity,
    },
  };
}

export async function createQuoteFromOpportunity(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createQuoteFromOpportunitySchema.parse(input);

  // Get opportunity
  const opportunity = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, validated.opportunityId),
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  // Generate quote number
  const quoteCount = await db.select().from(invoices).where(eq(invoices.type, 'QUOTE'));
  const quoteNumber = `QUOTE-${String(quoteCount.length + 1).padStart(5, '0')}`;

  // Calculate totals
  const subtotal = validated.lines.reduce((sum, line) => sum + (line.quantity * line.rate), 0);

  // Create quote invoice
  const [quote] = await db.insert(invoices).values({
    type: 'QUOTE',
    customerId: opportunity.customerId,
    opportunityId: validated.opportunityId,
    invoiceNumber: quoteNumber,
    date: validated.date,
    dueDate: validated.dueDate,
    validUntil: validated.validUntil,
    subtotal,
    taxTotal: 0,
    totalAmount: subtotal,
    balanceRemaining: subtotal,
    status: 'OPEN',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Create quote lines
  // Note: invoiceLines insert would go here - simplified for now

  // Update opportunity
  await db.update(opportunities)
    .set({
      quoteId: quote.id,
      stage: 'PROPOSAL',
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, validated.opportunityId));

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/quotes');
  revalidatePath(`/sales/opportunities/${validated.opportunityId}`);

  return { success: true, data: quote };
}

export async function convertQuoteToSalesOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = convertQuoteToSalesOrderSchema.parse(input);

  // Get quote
  const quote = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, validated.quoteId),
      eq(invoices.type, 'QUOTE')
    ),
    with: {
      lines: true,
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  // Generate SO number
  const soCount = await db.select().from(invoices).where(eq(invoices.type, 'SALES_ORDER'));
  const soNumber = `SO-${String(soCount.length + 1).padStart(5, '0')}`;

  // Create sales order by copying quote
  const [salesOrder] = await db.insert(invoices).values({
    type: 'SALES_ORDER',
    customerId: quote.customerId,
    opportunityId: quote.opportunityId,
    convertedFromQuoteId: quote.id,
    invoiceNumber: soNumber,
    date: validated.salesOrderDate,
    dueDate: validated.salesOrderDueDate || quote.dueDate,
    subtotal: quote.subtotal,
    taxTotal: quote.taxTotal,
    totalAmount: quote.totalAmount,
    balanceRemaining: quote.totalAmount,
    status: 'OPEN',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Copy quote lines to sales order
  // Note: invoiceLines copy would go here - simplified for now

  // Update quote as accepted
  await db.update(invoices)
    .set({
      quoteAcceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, validated.quoteId));

  // Update opportunity
  if (quote.opportunityId) {
    await db.update(opportunities)
      .set({
        salesOrderId: salesOrder.id,
        stage: 'CLOSED_WON',
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(opportunities.id, quote.opportunityId));
  }

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/quotes');
  revalidatePath(`/sales/quotes/${validated.quoteId}`);
  if (quote.opportunityId) {
    revalidatePath(`/sales/opportunities/${quote.opportunityId}`);
  }

  return { success: true, data: salesOrder };
}

// ============================================================================
// OPPORTUNITY ACTIONS
// ============================================================================

export async function createOpportunity(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createOpportunitySchema.parse(input);

  const [newOpportunity] = await db.insert(opportunities).values({
    ...validated,
    stage: 'LEAD',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/opportunities');
  return { success: true, data: newOpportunity };
}

export async function updateOpportunity(id: number, input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = updateOpportunitySchema.parse(input);

  const [updated] = await db.update(opportunities)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, id))
    .returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/opportunities');
  revalidatePath(`/sales/opportunities/${id}`);
  return { success: true, data: updated };
}

export async function updateOpportunityStage(id: number, stage: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validStage = z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).parse(stage);

  const updates: any = {
    stage: validStage,
    updatedAt: new Date(),
  };

  // Set closedAt timestamp for closed stages
  if (validStage === 'CLOSED_WON' || validStage === 'CLOSED_LOST') {
    updates.closedAt = new Date();
  }

  const [updated] = await db.update(opportunities)
    .set(updates)
    .where(eq(opportunities.id, id))
    .returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/opportunities');
  revalidatePath(`/sales/opportunities/${id}`);
  return { success: true, data: updated };
}

export async function getOpportunities(filters?: {
  stage?: string;
  customerId?: number;
  assignedToUserId?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const conditions = [];

  if (filters?.stage) {
    conditions.push(eq(opportunities.stage, filters.stage as any));
  }
  if (filters?.customerId) {
    conditions.push(eq(opportunities.customerId, filters.customerId));
  }
  if (filters?.assignedToUserId) {
    conditions.push(eq(opportunities.assignedToUserId, filters.assignedToUserId));
  }

  const results = await db.query.opportunities.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: true,
      assignedToUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      lead: {
        columns: {
          id: true,
          fullName: true,
        },
      },
      quote: {
        columns: {
          id: true,
          invoiceNumber: true,
        },
      },
      salesOrder: {
        columns: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
    orderBy: desc(opportunities.createdAt),
  });

  return results;
}

export async function getOpportunity(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const opportunity = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
    with: {
      customer: true,
      assignedToUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      lead: true,
      quote: true,
      salesOrder: true,
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  return opportunity;
}

export async function getPipelineStats() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get all open opportunities
  const openOpportunities = await db.query.opportunities.findMany({
    where: and(
      or(
        eq(opportunities.stage, 'LEAD'),
        eq(opportunities.stage, 'QUALIFIED'),
        eq(opportunities.stage, 'PROPOSAL'),
        eq(opportunities.stage, 'NEGOTIATION')
      )
    ),
  });

  // Calculate stats
  const totalValue = openOpportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0);
  const weightedValue = openOpportunities.reduce((sum, opp) => sum + (opp.estimatedValue * opp.probability / 100), 0);
  const opportunityCount = openOpportunities.length;

  // Get closed opportunities for win rate
  const closedOpportunities = await db.query.opportunities.findMany({
    where: or(
      eq(opportunities.stage, 'CLOSED_WON'),
      eq(opportunities.stage, 'CLOSED_LOST')
    ),
  });

  const wonCount = closedOpportunities.filter(opp => opp.stage === 'CLOSED_WON').length;
  const lostCount = closedOpportunities.filter(opp => opp.stage === 'CLOSED_LOST').length;
  const winRate = closedOpportunities.length > 0 ? (wonCount / closedOpportunities.length) * 100 : 0;

  // Stage breakdown
  const stageBreakdown = {
    LEAD: openOpportunities.filter(o => o.stage === 'LEAD').length,
    QUALIFIED: openOpportunities.filter(o => o.stage === 'QUALIFIED').length,
    PROPOSAL: openOpportunities.filter(o => o.stage === 'PROPOSAL').length,
    NEGOTIATION: openOpportunities.filter(o => o.stage === 'NEGOTIATION').length,
  };

  return {
    totalValue,
    weightedValue,
    opportunityCount,
    winRate,
    wonCount,
    lostCount,
    stageBreakdown,
  };
}
