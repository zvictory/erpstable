'use server';

import { auth } from '../../../src/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq, desc, asc, and, or, gte, lte, isNull, sql } from 'drizzle-orm';

// ... imports ...

export async function updateDealStage(id: number, stage: string, index?: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validStage = z.enum(['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).parse(stage);

  // If index is provided, we need to handle reordering
  if (typeof index === 'number') {
    // 1. Shift existing items in the target stage down to make space
    await db.update(deals)
      .set({ orderIndex: sql`${deals.orderIndex} + 1` })
      .where(and(
        eq(deals.stage, validStage),
        gte(deals.orderIndex, index)
      ));
  }

  const updates: any = {
    stage: validStage,
    updatedAt: new Date(),
  };

  if (typeof index === 'number') {
    updates.orderIndex = index;
  }

  // Set closed_at timestamp for closed stages
  if (validStage === 'CLOSED_WON' || validStage === 'CLOSED_LOST') {
    updates.closed_at = new Date();
  } else {
    // Allow reopening deals
    updates.closed_at = null;
  }

  const [updated] = await db.update(deals)
    .set(updates)
    .where(eq(deals.id, id))
    .returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/deals');
  revalidatePath(`/sales/deals/${id}`);
  return { success: true, data: updated };
}
import { leads, deals, customers, invoices, activities } from '../../../db/schema';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const createLeadSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required'),
  company_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'EXHIBITION', 'PARTNER', 'OTHER']).default('OTHER'),
  estimated_value: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  owner_id: z.number().int().positive().optional(),
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

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customer_id: z.number().int().positive(),
  value: z.number().int().min(0),
  currency_code: z.string().default('сўм'),
  probability: z.number().int().min(0).max(100).default(50),
  expected_close_date: z.date().optional(),
  description: z.string().optional(),
  next_action: z.string().optional(),
  owner_id: z.number().int().positive().optional(),
  lead_id: z.number().int().positive().optional(),
});

const updateDealSchema = createDealSchema.partial().extend({
  stage: z.enum(['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  lost_reason: z.string().optional(),
});

const createQuoteFromDealSchema = z.object({
  dealId: z.number().int().positive(),
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

const createActivitySchema = z.object({
  entity_type: z.enum(['LEAD', 'DEAL', 'CUSTOMER']),
  entity_id: z.number().int().positive(),
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']),
  subject: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  due_date: z.date().optional(),
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
  owner_id?: number;
  source?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as any));
  }
  if (filters?.owner_id) {
    conditions.push(eq(leads.owner_id, filters.owner_id));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source as any));
  }

  const results = await db.query.leads.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      convertedCustomer: {
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
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      convertedCustomer: true,
      deals: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Fetch activities separately since it's a polymorphic relation
  const leadActivities = await db.query.activities.findMany({
    where: and(
      eq(activities.entity_type, 'LEAD'),
      eq(activities.entity_id, id)
    ),
    with: {
      performedByUser: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: desc(activities.performed_at),
  });

  return {
    ...lead,
    activities: leadActivities,
  };
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
      is_converted: true,
      converted_customer_id: newCustomer.id,
      converted_at: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, validated.leadId))
    .returning();

  // 3. Optionally create deal
  let newDeal = null;
  if (validated.createOpportunity && validated.opportunityData) {
    [newDeal] = await db.insert(deals).values({
      title: validated.opportunityData.title,
      customer_id: newCustomer.id,
      value: validated.opportunityData.estimatedValue,
      currency_code: 'сўм',
      probability: validated.opportunityData.probability,
      description: validated.opportunityData.description,
      stage: 'DISCOVERY',
      lead_id: validated.leadId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  // 4. Log activity
  await db.insert(activities).values({
    entity_type: 'LEAD',
    entity_id: validated.leadId,
    type: 'NOTE',
    description: `Lead converted to customer: ${newCustomer.name}${newDeal ? `. Deal created: ${newDeal.title}` : ''}`,
    performed_by: parseInt(session.user.id!),
    performed_at: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath('/sales/leads');
  revalidatePath(`/sales/leads/${validated.leadId}`);
  revalidatePath('/sales/customers');
  if (newDeal) {
    revalidatePath('/sales/pipeline');
    revalidatePath('/sales/deals');
  }

  return {
    success: true,
    data: {
      customer: newCustomer,
      lead: updatedLead,
      deal: newDeal,
    },
  };
}

export async function createQuoteFromDeal(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createQuoteFromDealSchema.parse(input);

  // Get deal
  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, validated.dealId),
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Generate quote number
  const quoteCount = await db.select().from(invoices).where(eq(invoices.type, 'QUOTE'));
  const quoteNumber = `QUOTE-${String(quoteCount.length + 1).padStart(5, '0')}`;

  // Calculate totals
  const subtotal = validated.lines.reduce((sum: number, line: any) => sum + (line.quantity * line.rate), 0);

  // Create quote invoice
  const [quote] = await db.insert(invoices).values({
    type: 'QUOTE',
    customerId: deal.customer_id,
    deal_id: validated.dealId,
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

  // Update deal
  await db.update(deals)
    .set({
      quote_id: quote.id,
      stage: 'PROPOSAL',
      updatedAt: new Date(),
    })
    .where(eq(deals.id, validated.dealId));

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/quotes');
  revalidatePath(`/sales/deals/${validated.dealId}`);

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
    deal_id: quote.deal_id,
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

  // Update deal
  if (quote.deal_id) {
    await db.update(deals)
      .set({
        sales_order_id: salesOrder.id,
        stage: 'CLOSED_WON',
        closed_at: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, quote.deal_id));
  }

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/quotes');
  revalidatePath(`/sales/quotes/${validated.quoteId}`);
  if (quote.deal_id) {
    revalidatePath(`/sales/deals/${quote.deal_id}`);
  }

  return { success: true, data: salesOrder };
}

// ============================================================================
// DEAL ACTIONS
// ============================================================================

export async function createDeal(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createDealSchema.parse(input);

  const [newDeal] = await db.insert(deals).values({
    ...validated,
    stage: 'DISCOVERY',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/deals');
  return { success: true, data: newDeal };
}

export async function updateDeal(id: number, input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = updateDealSchema.parse(input);

  const [updated] = await db.update(deals)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, id))
    .returning();

  revalidatePath('/sales/pipeline');
  revalidatePath('/sales/deals');
  revalidatePath(`/sales/deals/${id}`);
  return { success: true, data: updated };
}

// Old updateDealStage removed (replaced at top of file)

export async function getDeals(filters?: {
  stage?: string;
  customer_id?: number;
  owner_id?: number;
}): Promise<Array<{
  id: number;
  title: string;
  value: number;
  probability: number;
  stage: string;
  customer_id: number;
  description: string | null;
  next_action: string | null;
  expected_close_date: Date | null;
  closed_at: Date | null;
  lost_reason: string | null;
  owner_id: number | null;
  lead_id: number | null;
  quote_id: number | null;
  sales_order_id: number | null;
  currency_code: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: number;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    creditLimit: number;
    paymentTerms: string;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
  } | null;
  lead?: {
    id: number;
    contact_name: string;
  } | null;
  quote?: {
    id: number;
    invoiceNumber: string;
  } | null;
  salesOrder?: {
    id: number;
    invoiceNumber: string;
  } | null;
  activities: Array<{
    id: number;
    entity_type: string;
    entity_id: number;
    type: string;
    subject: string | null;
    description: string;
    performed_at: Date;
    performed_by: number | null;
    due_date: Date | null;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    performedByUser?: {
      id: number;
      name: string;
    } | null;
  }>;
}>> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const conditions = [];

  if (filters?.stage) {
    conditions.push(eq(deals.stage, filters.stage as any));
  }
  if (filters?.customer_id) {
    conditions.push(eq(deals.customer_id, filters.customer_id));
  }
  if (filters?.owner_id) {
    conditions.push(eq(deals.owner_id, filters.owner_id));
  }

  const results = await db.query.deals.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: true,
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      lead: {
        columns: {
          id: true,
          contact_name: true,
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
    orderBy: [asc(deals.orderIndex), desc(deals.createdAt)],
  });

  // Note: activities relation is polymorphic and not included here
  // If needed, fetch separately using entity_type='DEAL' and entity_id
  return results as any;
}

export async function getDeal(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, id),
    with: {
      customer: true,
      owner: {
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

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Fetch activities separately since it's a polymorphic relation
  const dealActivities = await db.query.activities.findMany({
    where: and(
      eq(activities.entity_type, 'DEAL'),
      eq(activities.entity_id, id)
    ),
    with: {
      performedByUser: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: desc(activities.performed_at),
  });

  return {
    ...deal,
    activities: dealActivities,
  };
}

export async function getPipelineStats() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get all open deals
  const openDeals = await db.query.deals.findMany({
    where: and(
      or(
        eq(deals.stage, 'DISCOVERY'),
        eq(deals.stage, 'PROPOSAL'),
        eq(deals.stage, 'NEGOTIATION')
      )
    ),
  });

  // Calculate stats
  const totalValue = openDeals.reduce((sum: number, deal: any) => sum + deal.value, 0);
  const weightedValue = openDeals.reduce((sum: number, deal: any) => sum + (deal.value * deal.probability / 100), 0);
  const dealCount = openDeals.length;

  // Get closed deals for win rate
  const closedDeals = await db.query.deals.findMany({
    where: or(
      eq(deals.stage, 'CLOSED_WON'),
      eq(deals.stage, 'CLOSED_LOST')
    ),
  });

  const wonCount = closedDeals.filter((deal: any) => deal.stage === 'CLOSED_WON').length;
  const lostCount = closedDeals.filter((deal: any) => deal.stage === 'CLOSED_LOST').length;
  const winRate = closedDeals.length > 0 ? (wonCount / closedDeals.length) * 100 : 0;

  // Stage breakdown
  const stageBreakdown = {
    DISCOVERY: openDeals.filter((d: any) => d.stage === 'DISCOVERY').length,
    PROPOSAL: openDeals.filter((d: any) => d.stage === 'PROPOSAL').length,
    NEGOTIATION: openDeals.filter((d: any) => d.stage === 'NEGOTIATION').length,
  };

  return {
    totalValue,
    weightedValue,
    dealCount,
    winRate,
    wonCount,
    lostCount,
    stageBreakdown,
  };
}

// ============================================================================
// ACTIVITY ACTIONS
// ============================================================================

export async function createActivity(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = createActivitySchema.parse(input);

  const [newActivity] = await db.insert(activities).values({
    ...validated,
    performed_by: parseInt(session.user.id!),
    performed_at: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Revalidate based on entity type
  if (validated.entity_type === 'LEAD') {
    revalidatePath(`/sales/leads/${validated.entity_id}`);
  } else if (validated.entity_type === 'DEAL') {
    revalidatePath(`/sales/deals/${validated.entity_id}`);
  } else if (validated.entity_type === 'CUSTOMER') {
    revalidatePath(`/sales/customers/${validated.entity_id}`);
  }

  return { success: true, data: newActivity };
}

export async function getActivities(entityType: string, entityId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const results = await db.query.activities.findMany({
    where: and(
      eq(activities.entity_type, entityType as any),
      eq(activities.entity_id, entityId)
    ),
    with: {
      performedByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: desc(activities.performed_at),
  });

  return results;
}

export async function completeActivity(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const [updated] = await db.update(activities)
    .set({
      completed_at: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id))
    .returning();

  // Revalidate based on entity type
  if (updated.entity_type === 'LEAD') {
    revalidatePath(`/sales/leads/${updated.entity_id}`);
  } else if (updated.entity_type === 'DEAL') {
    revalidatePath(`/sales/deals/${updated.entity_id}`);
  } else if (updated.entity_type === 'CUSTOMER') {
    revalidatePath(`/sales/customers/${updated.entity_id}`);
  }

  return { success: true, data: updated };
}

export async function deleteActivity(id: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get activity first to know which page to revalidate
  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });

  if (!activity) {
    throw new Error('Activity not found');
  }

  await db.delete(activities).where(eq(activities.id, id));

  // Revalidate based on entity type
  if (activity.entity_type === 'LEAD') {
    revalidatePath(`/sales/leads/${activity.entity_id}`);
  } else if (activity.entity_type === 'DEAL') {
    revalidatePath(`/sales/deals/${activity.entity_id}`);
  } else if (activity.entity_type === 'CUSTOMER') {
    revalidatePath(`/sales/customers/${activity.entity_id}`);
  }

  return { success: true };
}
