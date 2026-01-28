'use server';

import { db } from '../../../db';
import { customers, invoices, invoiceLines, customerPayments, paymentAllocations } from '../../../db/schema/sales';
import { items, inventoryLayers, inventoryLocationTransfers } from '../../../db/schema/inventory';
import { journalEntries, journalEntryLines } from '../../../db/schema/finance';
import { eq, sql, inArray, and, asc, gt, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ACCOUNTS } from '@/lib/accounting-config';
import { checkPeriodLock } from './finance';
import { logAuditEvent, getChangedFields } from '@/lib/audit';

// --- Zod Schemas for Actions ---

const invoiceLineInputSchema = z.object({
    itemId: z.number(),
    quantity: z.number().min(0), // Base UOM
    rate: z.number().min(0), // Subunit (Tiyin)
    description: z.string().optional(),
    revenueAccountId: z.number().optional(), // For overriding default sales account
    warehouseId: z.number().optional(), // NEW - optional for warehouse-specific picking
});

const createInvoiceSchema = z.object({
    customerId: z.number(),
    date: z.coerce.date(),
    dueDate: z.coerce.date(),
    invoiceNumber: z.string(),
    lines: z.array(invoiceLineInputSchema).min(1),
    subtotal: z.number(), // Tiyin
    taxTotal: z.number(), // Tiyin
    totalAmount: z.number(), // Tiyin
});

const createPaymentSchema = z.object({
    customerId: z.number(),
    date: z.coerce.date(),
    amount: z.number().min(1), // Tiyin
    paymentMethod: z.enum(['CASH', 'CLICK', 'PAYME', 'BANK_TRANSFER']).default('CASH'),
    reference: z.string().optional(),
    allocations: z.array(z.object({
        invoiceId: z.number(),
        amountApplied: z.number().min(1),
    })),
});

const createCustomerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    creditLimit: z.coerce.number().min(0).default(0),
    taxId: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// --- Server Actions ---

export async function getCustomerCenterData(selectedId?: number) {
    try {
        // Fetch all active customers
        const allCustomers = await db.select().from(customers).where(eq(customers.isActive, true));

        // Fetch invoices for active customers with OPEN or PARTIAL status
        const activeCustomerInvoices = await db.select({
            id: invoices.id,
            customerId: invoices.customerId,
            invoiceNumber: invoices.invoiceNumber,
            totalAmount: invoices.totalAmount,
            dueDate: invoices.dueDate,
            balanceRemaining: invoices.balanceRemaining
        }).from(invoices).where(inArray(invoices.status, ['OPEN', 'PARTIAL']));

        // Group invoices by customer
        const invoicesByCustomer = new Map<number, typeof activeCustomerInvoices>();
        activeCustomerInvoices.forEach(inv => {
            if (!invoicesByCustomer.has(inv.customerId)) {
                invoicesByCustomer.set(inv.customerId, []);
            }
            invoicesByCustomer.get(inv.customerId)!.push(inv);
        });

        const customersWithBalances = allCustomers.map(c => {
            const custInvoices = invoicesByCustomer.get(c.id) || [];
            const balance = custInvoices.reduce((sum, inv) => sum + inv.balanceRemaining, 0);
            const isOverdue = custInvoices.some(inv => new Date(inv.dueDate) < new Date());
            return { ...c, invoices: custInvoices, balance, isOverdue };
        });

        let selectedCustomer = null;
        if (selectedId) {
            const selectedResults = await db.select().from(customers).where(eq(customers.id, selectedId)).limit(1);
            selectedCustomer = selectedResults[0];

            if (selectedCustomer) {
                // Fetch invoices and payments for selected customer
                const selectedInvoices = await db.select().from(invoices).where(eq(invoices.customerId, selectedId)).orderBy(desc(invoices.date));
                const selectedPayments = await db.select().from(customerPayments).where(eq(customerPayments.customerId, selectedId)).orderBy(desc(customerPayments.date));
                selectedCustomer = { ...selectedCustomer, invoices: selectedInvoices, payments: selectedPayments };
                const openInvoices = selectedCustomer.invoices.filter(i => i.status !== 'PAID');
                const openBalance = openInvoices.reduce((sum, i) => sum + i.balanceRemaining, 0); // Use balanceRemaining

                const overdueAmount = openInvoices
                    .filter(i => new Date(i.dueDate) < new Date())
                    .reduce((sum, i) => sum + i.balanceRemaining, 0);

                const transactions = [
                    ...selectedCustomer.invoices.map(inv => ({
                        id: `invoice-${inv.id}`,
                        date: inv.date,
                        type: 'Invoice',
                        ref: inv.invoiceNumber,
                        amount: inv.totalAmount,
                        status: inv.status
                    })),
                    ...selectedCustomer.payments.map(pmt => ({
                        id: `payment-${pmt.id}`,
                        date: pmt.date,
                        type: 'Payment',
                        ref: pmt.reference || `Pmt #${pmt.id}`,
                        amount: -pmt.amount,
                        status: 'PAID'
                    }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                selectedCustomer = {
                    ...selectedCustomer,
                    openBalance,
                    overdueAmount,
                    transactions,
                    unusedCredits: 0
                };
            }
        }

        return { customers: customersWithBalances, selectedCustomer };
    } catch (error: any) {
        console.error('❌ Get Customer Center Data Error:', error);
        console.error('Database error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });

        // Return empty data instead of throwing to prevent page crashes
        return {
            customers: [],
            selectedCustomer: null
        };
    }
}

export async function createInvoice(data: z.infer<typeof createInvoiceSchema>) {
    try {
        const validated = createInvoiceSchema.parse(data);

        // Validate tax amounts match (GAAP/IFRS compliance)
        const expectedTotal = validated.subtotal + validated.taxTotal;
        if (validated.totalAmount !== expectedTotal) {
            throw new Error(
                `Tax calculation mismatch: Total (${validated.totalAmount}) must equal Subtotal (${validated.subtotal}) + Tax (${validated.taxTotal})`
            );
        }

        // Check period lock (GAAP/IFRS compliance - prevent posting to closed periods)
        await checkPeriodLock(validated.date);

        return await db.transaction(async (tx) => {
            // 1. Create Invoice Header
            const [newInvoice] = await tx.insert(invoices).values({
                customerId: validated.customerId,
                date: validated.date,
                dueDate: validated.dueDate,
                invoiceNumber: validated.invoiceNumber,
                subtotal: validated.subtotal,
                taxTotal: validated.taxTotal,
                totalAmount: validated.totalAmount,
                balanceRemaining: validated.totalAmount, // Initially full amount
                status: 'OPEN',
            }).returning();

            // 2. Create Invoice Lines
            if (validated.lines.length > 0) {
                await tx.insert(invoiceLines).values(
                    validated.lines.map(line => ({
                        invoiceId: newInvoice.id,
                        itemId: line.itemId,
                        quantity: line.quantity,
                        rate: line.rate,
                        amount: Math.round(line.quantity * line.rate), // Ensure Tiyin integrity
                        description: line.description,
                        revenueAccountId: line.revenueAccountId,
                    }))
                );
            }

            // 3. Create GL Entries (Double Entry)
            const [je] = await tx.insert(journalEntries).values({
                date: validated.date,
                description: `Invoice #${validated.invoiceNumber}`,
                reference: validated.invoiceNumber,
                isPosted: true,
            }).returning();

            // Debit AR (1200)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.AR, // Accounts Receivable
                debit: validated.totalAmount,
                credit: 0,
                description: `Invoice #${validated.invoiceNumber} - Customer #${validated.customerId}`,
            });

            // Credit Sales Income (4100)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.SALES_INCOME, // Sales Income - Default
                debit: 0,
                credit: validated.subtotal,
                description: `Revenue - Invoice #${validated.invoiceNumber}`,
            });

            // Credit Sales Tax Payable (2200) - GAAP/IFRS Compliance
            if (validated.taxTotal > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: ACCOUNTS.SALES_TAX, // Sales Tax Payable
                    debit: 0,
                    credit: validated.taxTotal,
                    description: `Sales Tax - Invoice #${validated.invoiceNumber}`,
                });
            }

            // 4. Financial Event B: Cost of Goods Sold (COGS) & Inventory Deduction (FIFO)
            // Also track picking locations and create transfer records
            for (const line of validated.lines) {
                // Skip non-inventory items if applicable (future proofing)
                // For now, assume all items are inventory.

                let qtyRemainingToDeduct = line.quantity;
                let totalLineCost = 0;
                const pickingLocations: Array<{ layerId: number; batchNumber: string; pickQty: number; warehouseId: number | null; locationId: number | null }> = [];

                // Fetch FIFO Layers - Filter by warehouse if specified
                const whereConditions = [
                    eq(inventoryLayers.itemId, line.itemId),
                    eq(inventoryLayers.isDepleted, false),
                    gt(inventoryLayers.remainingQty, 0)
                ];

                // Add warehouse filter if specified
                if (line.warehouseId) {
                    whereConditions.push(eq(inventoryLayers.warehouseId, line.warehouseId));
                }

                const layers = await tx.select().from(inventoryLayers)
                    .where(and(...whereConditions))
                    .orderBy(asc(inventoryLayers.receiveDate), asc(inventoryLayers.id)); // FIFO

                // Calculate total available
                const totalAvailable = layers.reduce((sum, l) => sum + l.remainingQty, 0);

                if (totalAvailable < qtyRemainingToDeduct) {
                    const warehouseContext = line.warehouseId
                        ? ` in warehouse ${line.warehouseId}`
                        : '';
                    throw new Error(`Insufficient stock for item #${line.itemId}${warehouseContext}. Required: ${qtyRemainingToDeduct}, Available: ${totalAvailable}`);
                }

                for (const layer of layers) {
                    if (qtyRemainingToDeduct <= 0) break;

                    const deduct = Math.min(layer.remainingQty, qtyRemainingToDeduct);

                    // Accumulate Cost (Layer Cost * Deducted Qty)
                    totalLineCost += deduct * layer.unitCost;

                    // Track picking location for transfer record
                    pickingLocations.push({
                        layerId: layer.id,
                        batchNumber: layer.batchNumber,
                        pickQty: deduct,
                        warehouseId: layer.warehouseId,
                        locationId: layer.locationId,
                    });

                    // Update Layer
                    await tx.update(inventoryLayers)
                        .set({
                            remainingQty: layer.remainingQty - deduct,
                            isDepleted: (layer.remainingQty - deduct) === 0,
                            updatedAt: new Date(),
                        })
                        .where(eq(inventoryLayers.id, layer.id));

                    qtyRemainingToDeduct -= deduct;
                }

                // Create inventory location transfer records for each picked location
                for (const picking of pickingLocations) {
                    await tx.insert(inventoryLocationTransfers).values({
                        itemId: line.itemId,
                        batchNumber: picking.batchNumber,
                        fromWarehouseId: picking.warehouseId,
                        fromLocationId: picking.locationId,
                        toWarehouseId: null, // Shipping location
                        toLocationId: null,
                        quantity: picking.pickQty,
                        transferReason: 'picking',
                        status: 'completed',
                    });
                }

                // Create COGS Journal Entries
                // Dr Cost of Goods Sold (5100)
                // Cr Inventory Asset (1340)
                // We create one pair of entries per line item to keep the ledger detailed
                if (totalLineCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: '5100', // COGS
                        debit: totalLineCost,
                        credit: 0,
                        description: `COGS - ${line.description || 'Item Sale'}`,
                    });

                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: '1340', // Inventory Asset
                        debit: 0,
                        credit: totalLineCost,
                        description: `Inventory Depletion - ${line.description || 'Item Sale'}`,
                    });
                }
            }

            try { revalidatePath('/sales/customers'); } catch (e) { }
            return { success: true, invoiceId: newInvoice.id };
        });

    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getInvoiceById(invoiceId: number) {
    'use server';

    try {
        // Fetch invoice
        const invoiceResults = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        const invoice = invoiceResults[0];

        if (!invoice) {
            return {
                success: false,
                error: 'Invoice not found',
            };
        }

        // Fetch invoice lines
        const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

        // Attach lines to invoice object
        const invoiceWithLines = { ...invoice, lines, customer: null };

        // Format data for form
        const formData = {
            customerId: invoice.customerId,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            dueDate: invoice.dueDate,
            lines: lines.map(line => ({
                itemId: line.itemId,
                description: line.description,
                quantity: line.quantity,
                rate: line.rate,
                amount: line.amount,
            })),
            subtotal: invoice.subtotal,
            taxTotal: invoice.taxTotal,
            totalAmount: invoice.totalAmount,
        };

        return {
            success: true,
            invoice: invoiceWithLines,
            data: formData,
        };
    } catch (error: any) {
        console.error('Error fetching invoice:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch invoice',
        };
    }
}

export async function updateInvoice(invoiceId: number, data: z.infer<typeof createInvoiceSchema>) {
    'use server';

    try {
        // Validate tax amounts match (GAAP/IFRS compliance)
        const expectedTotal = data.subtotal + data.taxTotal;
        if (data.totalAmount !== expectedTotal) {
            throw new Error(
                `Tax calculation mismatch: Total (${data.totalAmount}) must equal Subtotal (${data.subtotal}) + Tax (${data.taxTotal})`
            );
        }

        // Check period lock for the new date (GAAP/IFRS compliance)
        await checkPeriodLock(data.date);

        return await db.transaction(async (tx) => {
            // 1. Verify invoice exists and is editable
            const existingInvoiceResults = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
            const existingInvoice = existingInvoiceResults[0];

            if (!existingInvoice) {
                return { success: false, error: 'Invoice not found' };
            }

            // 2. Reverse old inventory layers (FIFO)
            const oldLines = await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

            for (const oldLine of oldLines) {
                // Find layers that were consumed by this invoice line
                // For simplicity, we'll get the most recent layers and reverse them
                const layers = await tx.select().from(inventoryLayers)
                    .where(eq(inventoryLayers.itemId, oldLine.itemId))
                    .orderBy(asc(inventoryLayers.receiveDate));

                let qtyToRestore = oldLine.quantity;
                for (const layer of layers) {
                    if (qtyToRestore <= 0) break;
                    const restore = Math.min(layer.remainingQty + Math.min(qtyToRestore, layer.initialQty - layer.remainingQty), layer.initialQty);
                    const restoreAmount = Math.min(qtyToRestore, layer.initialQty - layer.remainingQty);

                    if (restoreAmount > 0) {
                        await tx.update(inventoryLayers)
                            .set({
                                remainingQty: layer.remainingQty + restoreAmount,
                                isDepleted: false,
                                updatedAt: new Date(),
                            })
                            .where(eq(inventoryLayers.id, layer.id));

                        qtyToRestore -= restoreAmount;
                    }
                }
            }

            // 3. Delete old invoice lines
            await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

            // 4. Update invoice header
            await tx.update(invoices)
                .set({
                    customerId: data.customerId,
                    invoiceNumber: data.invoiceNumber,
                    date: data.date,
                    dueDate: data.dueDate,
                    subtotal: data.subtotal,
                    taxTotal: data.taxTotal,
                    totalAmount: data.totalAmount,
                    updatedAt: new Date(),
                })
                .where(eq(invoices.id, invoiceId));

            // 5. Insert new invoice lines
            if (data.lines.length > 0) {
                await tx.insert(invoiceLines).values(
                    data.lines.map(line => ({
                        invoiceId,
                        itemId: line.itemId,
                        quantity: line.quantity,
                        rate: line.rate,
                        amount: Math.round(line.quantity * line.rate),
                        description: line.description,
                        revenueAccountId: line.revenueAccountId,
                    }))
                );
            }

            // 6. Consume new inventory (FIFO)
            for (const line of data.lines) {
                let qtyRemainingToDeduct = line.quantity;
                let totalLineCost = 0;

                const layers = await tx.select().from(inventoryLayers)
                    .where(and(
                        eq(inventoryLayers.itemId, line.itemId),
                        eq(inventoryLayers.isDepleted, false),
                        gt(inventoryLayers.remainingQty, 0)
                    ))
                    .orderBy(asc(inventoryLayers.receiveDate), asc(inventoryLayers.id));

                const totalAvailable = layers.reduce((sum, l) => sum + l.remainingQty, 0);

                if (totalAvailable < qtyRemainingToDeduct) {
                    throw new Error(`Insufficient stock for item #${line.itemId}. Required: ${qtyRemainingToDeduct}, Available: ${totalAvailable}`);
                }

                for (const layer of layers) {
                    if (qtyRemainingToDeduct <= 0) break;

                    const deduct = Math.min(layer.remainingQty, qtyRemainingToDeduct);
                    totalLineCost += deduct * layer.unitCost;

                    await tx.update(inventoryLayers)
                        .set({
                            remainingQty: layer.remainingQty - deduct,
                            isDepleted: (layer.remainingQty - deduct) === 0,
                            updatedAt: new Date(),
                        })
                        .where(eq(inventoryLayers.id, layer.id));

                    qtyRemainingToDeduct -= deduct;
                }
            }

            // 7. Update GL entries (delete old, create new)
            const oldJEResults = await tx.select().from(journalEntries).where(eq(journalEntries.reference, data.invoiceNumber)).limit(1);
            const oldJE = oldJEResults[0];

            if (oldJE) {
                await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, oldJE.id));
                await tx.delete(journalEntries).where(eq(journalEntries.id, oldJE.id));
            }

            // Create new GL entries
            const [je] = await tx.insert(journalEntries).values({
                date: data.date,
                description: `Invoice #${data.invoiceNumber} (Updated)`,
                reference: data.invoiceNumber,
                isPosted: true,
            }).returning();

            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.AR,
                debit: data.totalAmount,
                credit: 0,
                description: `Invoice #${data.invoiceNumber} - Customer #${data.customerId}`,
            });

            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.SALES_INCOME,
                debit: 0,
                credit: data.subtotal,
                description: `Revenue - Invoice #${data.invoiceNumber}`,
            });

            // Credit Sales Tax Payable (2200) - GAAP/IFRS Compliance
            if (data.taxTotal > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: ACCOUNTS.SALES_TAX,
                    debit: 0,
                    credit: data.taxTotal,
                    description: `Sales Tax - Invoice #${data.invoiceNumber}`,
                });
            }

            // Audit log after successful transaction
            await logAuditEvent({
                entity: 'invoice',
                entityId: invoiceId.toString(),
                action: 'UPDATE',
                changes: {
                    before: {
                        invoiceNumber: existingInvoice.invoiceNumber,
                        customerId: existingInvoice.customerId,
                        totalAmount: existingInvoice.totalAmount,
                        date: existingInvoice.date
                    },
                    after: {
                        invoiceNumber: data.invoiceNumber,
                        customerId: data.customerId,
                        totalAmount: data.totalAmount,
                        date: data.date
                    },
                    fields: getChangedFields(
                        {
                            invoiceNumber: existingInvoice.invoiceNumber,
                            customerId: existingInvoice.customerId,
                            totalAmount: existingInvoice.totalAmount,
                            date: existingInvoice.date.toString()
                        },
                        {
                            invoiceNumber: data.invoiceNumber,
                            customerId: data.customerId,
                            totalAmount: data.totalAmount,
                            date: data.date.toString()
                        }
                    )
                }
            });

            try { revalidatePath('/sales/customers'); } catch (e) { }
            return {
                success: true,
                message: 'Invoice updated successfully',
                invoiceId,
            };
        });
    } catch (error: any) {
        console.error('Error updating invoice:', error);
        return {
            success: false,
            error: error.message || 'Failed to update invoice',
        };
    }
}

export async function deleteInvoice(invoiceId: number) {
    'use server';

    try {
        return await db.transaction(async (tx) => {
            // 1. Verify invoice exists
            const invoiceResults = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
            const invoice = invoiceResults[0];

            if (!invoice) {
                return { success: false, error: 'Invoice not found' };
            }

            // Check period lock - cannot delete invoices in closed periods (GAAP/IFRS compliance)
            await checkPeriodLock(invoice.date);

            // 2. Reverse inventory consumption (restore to layers)
            const lines = await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

            for (const line of lines) {
                const layers = await tx.select().from(inventoryLayers)
                    .where(eq(inventoryLayers.itemId, line.itemId))
                    .orderBy(asc(inventoryLayers.receiveDate));

                let qtyToRestore = line.quantity;
                for (const layer of layers) {
                    if (qtyToRestore <= 0) break;
                    const restoreAmount = Math.min(qtyToRestore, layer.initialQty - layer.remainingQty);

                    if (restoreAmount > 0) {
                        await tx.update(inventoryLayers)
                            .set({
                                remainingQty: layer.remainingQty + restoreAmount,
                                isDepleted: false,
                                updatedAt: new Date(),
                            })
                            .where(eq(inventoryLayers.id, layer.id));

                        qtyToRestore -= restoreAmount;
                    }
                }
            }

            // 3. Reverse GL entries
            const jeResults = await tx.select().from(journalEntries).where(eq(journalEntries.reference, invoice.invoiceNumber)).limit(1);
            const je = jeResults[0];

            if (je) {
                await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
                await tx.delete(journalEntries).where(eq(journalEntries.id, je.id));
            }

            // 4. Delete invoice lines
            await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

            // 5. Delete invoice
            await tx.delete(invoices).where(eq(invoices.id, invoiceId));

            try { revalidatePath('/sales/customers'); } catch (e) { }
            return {
                success: true,
                message: 'Invoice deleted successfully',
            };
        });
    } catch (error: any) {
        console.error('Error deleting invoice:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete invoice',
        };
    }
}

export async function receivePayment(data: z.infer<typeof createPaymentSchema>) {
    try {
        const validated = createPaymentSchema.parse(data);

        return await db.transaction(async (tx) => {
            // 1. Create Payment Record
            const [newPayment] = await tx.insert(customerPayments).values({
                customerId: validated.customerId,
                date: validated.date,
                amount: validated.amount,
                paymentMethod: validated.paymentMethod,
                reference: validated.reference,
            }).returning();

            // 2. Process Allocations
            for (const alloc of validated.allocations) {
                // Link Payment to Invoice
                await tx.insert(paymentAllocations).values({
                    paymentId: newPayment.id,
                    invoiceId: alloc.invoiceId,
                    amountApplied: alloc.amountApplied,
                });

                // Update Invoice Balance
                // Fetch current status to ensure safe update
                const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, alloc.invoiceId));
                if (!invoice) throw new Error(`Invoice #${alloc.invoiceId} not found`);

                const newBalance = invoice.balanceRemaining - alloc.amountApplied;
                const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

                await tx.update(invoices)
                    .set({
                        balanceRemaining: newBalance,
                        status: newStatus
                    })
                    .where(eq(invoices.id, alloc.invoiceId));
            }

            // 3. Create GL Entries
            const [je] = await tx.insert(journalEntries).values({
                date: validated.date,
                description: `Payment from Customer #${validated.customerId}`,
                reference: validated.reference,
                isPosted: true,
            }).returning();

            // Debit Undeposited Funds (1105) or Bank (1110)
            const depositAccount = validated.paymentMethod === 'BANK_TRANSFER' ? '1110' : '1105';

            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: depositAccount,
                debit: validated.amount,
                credit: 0,
                description: `Payment Receipt - ${validated.paymentMethod}`,
            });

            // Credit Accounts Receivable (1200)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '1200', // Accounts Receivable
                debit: 0,
                credit: validated.amount,
                description: `Payment Appl - Customer #${validated.customerId}`,
            });

            // Audit log after successful payment
            await logAuditEvent({
                entity: 'payment',
                entityId: newPayment.id.toString(),
                action: 'CREATE',
                changes: {
                    after: {
                        customerId: validated.customerId,
                        amount: validated.amount,
                        paymentMethod: validated.paymentMethod,
                        reference: validated.reference
                    }
                }
            });

            try { revalidatePath('/sales/customers'); } catch (e) { }
            return { success: true, paymentId: newPayment.id };
        });

    } catch (error: any) {
        console.error('Receive Payment Error:', error);
        return { success: false, error: error.message };
    }
}

// --- Customer CRUD Actions ---

export async function createCustomer(data: z.infer<typeof createCustomerSchema>) {
    try {
        const validated = createCustomerSchema.parse(data);

        const [newCustomer] = await db.insert(customers).values({
            name: validated.name,
            email: validated.email || null,
            phone: validated.phone || null,
            address: validated.address || null,
            creditLimit: validated.creditLimit,
            taxId: validated.taxId || null,
            isActive: true,
        }).returning();

        revalidatePath('/sales/customers');
        return { success: true, customer: newCustomer };
    } catch (error: any) {
        console.error('Create Customer Error:', error);
        return { success: false, error: error.message || 'Failed to create customer' };
    }
}

export async function updateCustomer(id: number, data: z.infer<typeof updateCustomerSchema>) {
    try {
        const validated = updateCustomerSchema.parse(data);

        const [updatedCustomer] = await db.update(customers)
            .set({
                ...(validated.name && { name: validated.name }),
                ...(validated.email !== undefined && { email: validated.email || null }),
                ...(validated.phone !== undefined && { phone: validated.phone || null }),
                ...(validated.address !== undefined && { address: validated.address || null }),
                ...(validated.creditLimit !== undefined && { creditLimit: validated.creditLimit }),
                ...(validated.taxId !== undefined && { taxId: validated.taxId || null }),
            })
            .where(eq(customers.id, id))
            .returning();

        revalidatePath('/sales/customers');
        return { success: true, customer: updatedCustomer };
    } catch (error: any) {
        console.error('Update Customer Error:', error);
        return { success: false, error: error.message || 'Failed to update customer' };
    }
}

export async function getCustomerKPIs() {
    'use server';

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Open Quotes: status = 'QUOTE'
        const openQuotesResults = await db.select({
            count: sql<number>`cast(count(*) as int)`,
            total: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)`
        }).from(invoices).where(eq(invoices.status, 'QUOTE'));

        // Unbilled Orders: status = 'OPEN'
        const unbilledOrdersResults = await db.select({
            count: sql<number>`cast(count(*) as int)`,
            total: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)`
        }).from(invoices).where(eq(invoices.status, 'OPEN'));

        // Overdue AR: status IN ('OPEN', 'PARTIAL') AND dueDate < today
        const overdueARResults = await db.select({
            count: sql<number>`cast(count(*) as int)`,
            total: sql<number>`coalesce(sum(${invoices.balanceRemaining}), 0)`
        }).from(invoices).where(and(
            inArray(invoices.status, ['OPEN', 'PARTIAL']),
            sql`${invoices.dueDate} < ${now.toISOString().split('T')[0]}`
        ));

        // Paid Last 30 Days: sum of payments.amount where date >= thirtyDaysAgo
        const paidLast30Results = await db.select({
            count: sql<number>`cast(count(*) as int)`,
            total: sql<number>`coalesce(sum(${customerPayments.amount}), 0)`
        }).from(customerPayments).where(
            sql`${customerPayments.date} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        );

        return {
            openQuotes: {
                count: openQuotesResults[0]?.count || 0,
                total: openQuotesResults[0]?.total || 0
            },
            unbilledOrders: {
                count: unbilledOrdersResults[0]?.count || 0,
                total: unbilledOrdersResults[0]?.total || 0
            },
            overdueAR: {
                count: overdueARResults[0]?.count || 0,
                total: overdueARResults[0]?.total || 0
            },
            paidLast30: {
                count: paidLast30Results[0]?.count || 0,
                total: paidLast30Results[0]?.total || 0
            }
        };
    } catch (error: any) {
        console.error('Get Customer KPIs Error:', error);
        return {
            openQuotes: { count: 0, total: 0 },
            unbilledOrders: { count: 0, total: 0 },
            overdueAR: { count: 0, total: 0 },
            paidLast30: { count: 0, total: 0 }
        };
    }
}
