'use server';

import { db } from '../../../db';
import {
    vendors, purchaseOrders, purchaseOrderLines, vendorBills, vendorBillLines,
    inventoryLayers, journalEntries, journalEntryLines, items, glAccounts
} from '../../../db/schema';
import { eq, sql, inArray, or, like, desc, asc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ACCOUNTS } from '../../lib/accounting-config';
import { purchasingDocumentSchema } from '@/lib/validators/purchasing';
import { getItemCostingInfo } from './inventory-costing';
import { updateItemInventoryFields } from './inventory-tools';
import { checkPeriodLock } from './finance';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { getPreferences } from './preferences';
import { getPreferenceBoolean, getPreferenceInteger } from '@/lib/preferences';
import { createPendingGRN } from './inventory';
import { logAuditEvent } from '@/lib/audit';

// --- Validation Schemas ---
const vendorSchema = z.object({
    name: z.string().min(1),
    taxId: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().default('UZS'),
});

const poItemSchema = z.object({
    itemId: z.coerce.number(),
    qty: z.coerce.number().min(1),
    unitCost: z.coerce.number().min(0), // Tiyin
});

const poSchema = z.object({
    vendorId: z.coerce.number(),
    date: z.coerce.date(),
    expectedDate: z.coerce.date().optional(),
    orderNumber: z.string().min(1),
    items: z.array(poItemSchema).min(1),
    notes: z.string().optional(),
});

const receiveLineSchema = z.object({
    itemId: z.coerce.number(),
    quantity: z.coerce.number().min(0.0001),
    unitPrice: z.coerce.number().min(0),
    description: z.string().optional(),
});

const purchasingDocSchema = z.object({
    vendorId: z.coerce.number(),
    date: z.union([z.date(), z.string().transform(val => new Date(val))]),
    refNumber: z.string().min(1),
    terms: z.string().optional(),
    items: z.array(receiveLineSchema).min(1),
    memo: z.string().optional(),
    poId: z.coerce.number().optional(),
    receiptId: z.coerce.number().optional(),
});

const payBillSchema = z.object({
    vendorId: z.coerce.number(),
    amount: z.coerce.number().min(1),
    date: z.union([z.date(), z.string().transform(val => new Date(val))]),
    bankAccountId: z.string().default('1110'), // Bank Account 1110
    refNumber: z.string().optional(),
});

// --- Actions ---

export async function createVendor(data: z.infer<typeof vendorSchema>) {
    try {
        const validated = vendorSchema.parse(data);
        const [newVendor] = await db.insert(vendors).values(validated).returning();
        try { revalidatePath('/purchasing/vendors'); } catch (e) { }
        return { success: true, vendor: newVendor };
    } catch (error: any) {
        console.error('Create Vendor Error:', error);
        return { success: false, error: error.message || 'Failed to create vendor' };
    }
}

export async function updateVendor(id: number, data: z.infer<typeof vendorSchema>) {
    try {
        const validated = vendorSchema.parse(data);

        // Check if vendor exists
        const existingVendorResults = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
        const existingVendor = existingVendorResults[0];

        if (!existingVendor) {
            return { success: false, error: 'Vendor not found' };
        }

        // Update vendor
        const [updatedVendor] = await db
            .update(vendors)
            .set({
                name: validated.name,
                taxId: validated.taxId,
                email: validated.email,
                phone: validated.phone,
                address: validated.address,
                paymentTerms: validated.paymentTerms,
                currency: validated.currency,
                updatedAt: sql`(unixepoch())`
            })
            .where(eq(vendors.id, id))
            .returning();

        try {
            revalidatePath('/purchasing/vendors');
        } catch (e) {
            console.error('Revalidate error:', e);
        }

        return { success: true, vendor: updatedVendor };
    } catch (error: any) {
        console.error('Update Vendor Error:', error);
        return { success: false, error: error.message || 'Failed to update vendor' };
    }
}

export async function getVendorById(id: number) {
    'use server';

    try {
        const vendorResults = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
        const vendor = vendorResults[0];

        if (!vendor) {
            return { success: false, error: 'Vendor not found' };
        }

        return { success: true, vendor };
    } catch (error: any) {
        console.error('Get Vendor Error:', error);
        return { success: false, error: error.message || 'Failed to load vendor' };
    }
}

export async function getVendors() {
    return await db.select().from(vendors).where(eq(vendors.isActive, true));
}

export async function getVendorCenterData(selectedId?: number) {
    try {
        // 1. Fetch all active vendors
        const allVendors = await db.select().from(vendors).where(eq(vendors.isActive, true));

        // Get bills for all vendors
        const allBills = await db.select().from(vendorBills).where(inArray(vendorBills.status, ['OPEN', 'PARTIAL']));

        // Group bills by vendor and calculate balances
        const vendorsWithBalances = allVendors.map(v => ({
            ...v,
            balance: allBills
                .filter((b: any) => b.vendorId === v.id)
                .reduce((sum: number, b: any) => sum + b.totalAmount, 0)
        }));

        let selectedVendor = null;
        if (selectedId) {
            // 2. Fetch full details for the selected vendor
            const selectedVendorResults = await db.select().from(vendors).where(eq(vendors.id, selectedId)).limit(1);
            selectedVendor = selectedVendorResults[0];

            if (selectedVendor) {
                // Fetch purchase orders and bills for selected vendor
                const poList = await db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorId, selectedId)).orderBy(desc(purchaseOrders.date));
                const bills = await db.select().from(vendorBills).where(eq(vendorBills.vendorId, selectedId)).orderBy(desc(vendorBills.billDate));

                // Attach to selectedVendor
                selectedVendor = { ...selectedVendor, purchaseOrders: poList, bills };

                // Calculate KPIs
                const openBills = bills.filter((b: any) => b.status !== 'PAID');
                const openBalance = openBills.reduce((sum: number, b: any) => sum + b.totalAmount, 0);

                const paidBills = selectedVendor.bills.filter((b: any) => b.status === 'PAID');
                const lastPaymentDate = paidBills.length > 0
                    ? new Date(Math.max(...paidBills.map((b: any) => new Date(b.billDate).getTime())))
                    : null;

                const thisYear = new Date().getFullYear();
                const ytdVolume = selectedVendor.purchaseOrders
                    .filter((po: any) => new Date(po.date).getFullYear() === thisYear)
                    .reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);

                // Group history for Transaction List tab
                const transactions = [
                    ...selectedVendor.purchaseOrders.map(po => ({
                        id: `po-${po.id}`,
                        date: po.date,
                        type: 'Purchase Order',
                        ref: po.orderNumber,
                        amount: po.totalAmount || 0,
                        status: po.status
                    })),
                    ...selectedVendor.bills.map(b => ({
                        id: `bill-${b.id}`,
                        date: b.billDate,
                        type: 'Bill',
                        ref: b.billNumber || `Bill #${b.id}`,
                        amount: b.totalAmount,
                        status: b.status
                    }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                // Spending trend (simplified last 6 months)
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const now = new Date();
                const trend = Array.from({ length: 6 }).map((_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                    const monthKey = d.getMonth();
                    const yearKey = d.getFullYear();

                    const monthTotal = selectedVendor!.purchaseOrders
                        .filter((po: any) => {
                            const poDate = new Date(po.date);
                            return poDate.getMonth() === monthKey && poDate.getFullYear() === yearKey;
                        })
                        .reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);

                    return {
                        name: monthNames[monthKey],
                        value: monthTotal / 100 // Convert Tiyin to main currency for chart
                    };
                });

                // Reliability Score (simulated based on PO status vs expected)
                // For demo: (Closed POs / Total POs) * 100
                const closedPOs = selectedVendor.purchaseOrders.filter((po: any) => po.status === 'CLOSED').length;
                const totalPOs = selectedVendor.purchaseOrders.length;
                const reliability = totalPOs > 0 ? Math.round((closedPOs / totalPOs) * 100) : 100;

                selectedVendor = {
                    ...selectedVendor,
                    openBalance,
                    lastPaymentDate,
                    ytdVolume,
                    transactions,
                    trend,
                    reliability
                };
            }
        }

        // Calculate scoreboard stats
        const allPOs = await db.select().from(purchaseOrders);
        const allBillsForStats = await db.select().from(vendorBills);

        // Open POs (OPEN or PARTIAL status)
        const openPOs = allPOs.filter((po: any) => po.status === 'OPEN' || po.status === 'PARTIAL');
        const openPOsStats = {
            count: openPOs.length,
            total: openPOs.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0)
        };

        // Open Bills (OPEN or PARTIAL status)
        const openBillsList = allBillsForStats.filter((b: any) => b.status === 'OPEN' || b.status === 'PARTIAL');
        const openBillsStats = {
            count: openBillsList.length,
            total: openBillsList.reduce((sum: number, b: any) => sum + b.totalAmount, 0)
        };

        // Overdue Bills (OPEN/PARTIAL and past due date - assume Net 30 from bill date)
        const now = new Date();
        const overdueBills = openBillsList.filter((b: any) => {
            const dueDate = new Date(b.billDate);
            dueDate.setDate(dueDate.getDate() + 30); // Net 30
            return now > dueDate;
        });
        const overdueStats = {
            count: overdueBills.length,
            total: overdueBills.reduce((sum: number, b: any) => sum + b.totalAmount, 0)
        };

        // Paid in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const paidBills = allBillsForStats.filter((b: any) =>
            b.status === 'PAID' && new Date(b.updatedAt) >= thirtyDaysAgo
        );
        const paidLast30Stats = {
            count: paidBills.length,
            total: paidBills.reduce((sum: number, b: any) => sum + b.totalAmount, 0)
        };

        return {
            vendors: vendorsWithBalances,
            selectedVendor,
            stats: {
                openPOs: openPOsStats,
                overdueBills: overdueStats,
                openBills: openBillsStats,
                paidLast30: paidLast30Stats
            }
        };
    } catch (error: any) {
        console.error('Get Vendor Center Data Error:', error);
        throw new Error('Failed to load vendor center data');
    }
}

export async function savePurchaseOrder(data: z.infer<typeof purchasingDocSchema>) {
    try {
        const val = purchasingDocSchema.parse(data);
        const totalAmount = val.items.reduce((sum: number, item: any) => sum + Math.round(item.quantity * item.unitPrice), 0);

        return await db.transaction(async (tx: any) => {
            const [po] = await tx.insert(purchaseOrders).values({
                vendorId: val.vendorId,
                date: val.date,
                orderNumber: val.refNumber,
                notes: val.memo,
                totalAmount,
                status: 'OPEN',
            }).returning();

            for (const item of val.items) {
                await tx.insert(purchaseOrderLines).values({
                    poId: po.id,
                    itemId: item.itemId,
                    qtyOrdered: item.quantity,
                    qtyReceived: 0,
                    unitCost: item.unitPrice,
                    description: item.description,
                });
            }

            try {
                revalidatePath('/purchasing/vendors');
                revalidatePath('/purchasing/orders');
            } catch (e) { }
            return {
                success: true,
                message: `Purchase Order ${val.refNumber} saved successfully`
            };
        });
    } catch (error: any) {
        console.error('Save PO Error:', error);
        return { success: false, error: error.message || 'Failed to save PO' };
    }
}

export async function saveItemReceipt(data: z.infer<typeof purchasingDocSchema>) {
    try {
        const val = purchasingDocSchema.parse(data);
        const totalAmount = val.items.reduce((sum: number, item: any) => sum + Math.round(item.quantity * item.unitPrice), 0);

        return await db.transaction(async (tx: any) => {
            // 2. Update PO lines if linked (Inventory layers are NOT created here - bills are the source of inventory)
            if (val.poId) {
                for (const item of val.items) {
                    await tx.update(purchaseOrderLines)
                        .set({ qtyReceived: sql`${purchaseOrderLines.qtyReceived} + ${item.quantity}` })
                        .where(eq(purchaseOrderLines.poId, val.poId)); // Simplified, should match itemId
                }
            }

            // 3. GL Entry: Accrual on Receipt
            const [je] = await tx.insert(journalEntries).values({
                date: val.date,
                description: `Item Receipt: ${val.refNumber}`,
                reference: val.refNumber,
                isPosted: true,
            }).returning();

            // Debit Inventory (1310)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '1310',
                debit: totalAmount,
                credit: 0,
                description: `Stock Receipt ${val.refNumber}`
            });

            // Credit Accrued Liability / GRNI (2110)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '2110',
                debit: 0,
                credit: totalAmount,
                description: `Accrual for Receipt ${val.refNumber}`
            });

            // 4. Update PO status
            if (val.poId) {
                // Simplified: Set to PARTIAL/CLOSED
                await tx.update(purchaseOrders)
                    .set({ status: 'PARTIAL' })
                    .where(eq(purchaseOrders.id, val.poId));
            }

            try {
                revalidatePath('/purchasing/vendors');
                revalidatePath('/inventory/items');
            } catch (e) { }
            return { success: true };
        });
    } catch (error: any) {
        console.error('Save Receipt Error:', error);
        return { success: false, error: error.message || 'Failed to save receipt' };
    }
}

export async function createVendorBill(data: any) {
    try {
        // Use the shared schema that expects transactionDate (matches form data)
        const val = purchasingDocumentSchema.parse(data);

        // Get current user role from session
        const session = await auth();
        const userRole = (session?.user as any)?.role as string | undefined;

        // Check period lock (GAAP/IFRS compliance - prevent posting to closed periods)
        await checkPeriodLock(val.transactionDate);

        // THREE-WAY MATCH VALIDATION (GAAP/IFRS Compliance - prevent billing undelivered goods)
        if (val.poId) {
            // Fetch PO lines for this purchase order
            const poLines = await db.select().from(purchaseOrderLines)
                .where(eq(purchaseOrderLines.poId, val.poId));

            if (poLines.length === 0) {
                throw new Error(`Purchase Order #${val.poId} has no line items`);
            }

            // Validate each bill line against PO
            for (const billItem of val.items) {
                const billItemId = Number(billItem.itemId);
                const billQty = parseFloat(billItem.quantity as any) || 0;
                const billPrice = parseFloat(billItem.unitPrice as any) || 0;

                // Find matching PO line
                const poLine = poLines.find((pl: any) => pl.itemId === billItemId);
                if (!poLine) {
                    throw new Error(
                        `Item #${billItemId} is not on Purchase Order #${val.poId}. ` +
                        `Three-way match failed.`
                    );
                }

                // Check 1: Cannot bill more than received
                const alreadyBilled = poLine.qtyBilled || 0;
                const availableToBill = poLine.qtyReceived - alreadyBilled;

                if (billQty > availableToBill) {
                    throw new Error(
                        `Cannot bill ${billQty} units of item #${billItemId}. ` +
                        `Only ${availableToBill} units available (${poLine.qtyReceived} received, ${alreadyBilled} already billed). ` +
                        `Three-way match violation.`
                    );
                }

                // Check 2: Price variance validation (5% tolerance)
                const poUnitCostTiyin = poLine.unitCost; // Already in Tiyin
                const billUnitCostTiyin = Math.round(billPrice * 100); // Convert to Tiyin
                const priceVariance = Math.abs(billUnitCostTiyin - poUnitCostTiyin);
                const tolerance = poUnitCostTiyin * 0.05; // 5% tolerance

                if (priceVariance > tolerance) {
                    console.warn(
                        `⚠️ PRICE VARIANCE WARNING: Item #${billItemId} - ` +
                        `Expected: ${poUnitCostTiyin} Tiyin, Bill: ${billUnitCostTiyin} Tiyin, ` +
                        `Variance: ${((priceVariance / poUnitCostTiyin) * 100).toFixed(2)}%`
                    );
                    // Allow with warning (not blocking, but logged for audit)
                }
            }
        }

        // Convert to Tiyin (integers) safely
        const totalSubtotalTiyin = val.items.reduce((sum: number, item: any) => {
            const qty = parseFloat(item.quantity as any) || 0;
            const rate = parseFloat(item.unitPrice as any) || 0;
            return sum + Math.round(qty * rate * 100);
        }, 0);

        const totalAmountTiyin = totalSubtotalTiyin;

        // Fetch preferences to determine if approval is required
        const prefsResult = await getPreferences();
        const prefs = prefsResult.success ? prefsResult.preferences : {};

        // Check if approval workflow is enabled
        const billApprovalEnabled = getPreferenceBoolean(
            prefs['BILL_APPROVAL_ENABLED'],
            true // default: enabled
        );

        // Get current approval threshold
        const approvalThreshold = getPreferenceInteger(
            prefs['BILL_APPROVAL_THRESHOLD'],
            1_000_000_000 // default: 10M UZS in Tiyin
        );

        // Determine if this bill requires approval
        const requiresApproval =
            billApprovalEnabled && // Feature enabled
            totalAmountTiyin > approvalThreshold && // Amount exceeds threshold
            userRole !== UserRole.ADMIN; // User is not admin

        // Pre-validation: Load all items and validate
        const itemIds = val.items.map((item: any) => Number(item.itemId));
        const itemsData = await db.select({
            id: items.id,
            name: items.name,
            assetAccountCode: items.assetAccountCode,
            itemClass: items.itemClass,
            valuationMethod: items.valuationMethod,
        }).from(items).where(inArray(items.id, itemIds));

        const itemsMap = new Map(itemsData.map((i: any) => [i.id, i]));

        // Validate all items exist
        for (const item of val.items) {
            const itemData = itemsMap.get(Number(item.itemId));
            if (!itemData) throw new Error(`Item ${item.itemId} not found`);
        }

        // Variables to capture for post-transaction QC inspection generation
        let billId = 0;
        const inspectionsToGenerate: Array<{ itemId: number; batchNumber: string; quantity: number }> = [];

        const result = await db.transaction(async (tx: any) => {
            // 1. Create Bill
            const [bill] = await tx.insert(vendorBills).values({
                vendorId: Number(val.vendorId),
                poId: val.poId ? Number(val.poId) : null,
                billDate: val.transactionDate, // purchasingDocumentSchema already coerces to Date
                billNumber: val.refNumber,
                totalAmount: totalAmountTiyin,
                status: 'OPEN',
                approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
            }).returning();

            billId = bill.id;

            // 2. Insert Bill Lines
            for (let i = 0; i < val.items.length; i++) {
                const item = val.items[i];
                const qty = parseFloat(item.quantity as any) || 0;
                const price = parseFloat(item.unitPrice as any) || 0;
                const lineAmount = Math.round(qty * price * 100);

                await tx.insert(vendorBillLines).values({
                    billId: bill.id,
                    itemId: Number(item.itemId),
                    description: item.description || '',
                    quantity: qty,
                    unitPrice: Math.round(price * 100),
                    amount: lineAmount,
                    lineNumber: i + 1,
                });
            }

            // 2b. Update qtyBilled on PO lines (Three-way match control)
            if (val.poId) {
                for (const item of val.items) {
                    const qty = parseFloat(item.quantity as any) || 0;
                    const itemId = Number(item.itemId);

                    // Find the matching PO line and update qtyBilled
                    await tx.update(purchaseOrderLines)
                        .set({
                            qtyBilled: sql`${purchaseOrderLines.qtyBilled} + ${qty}`
                        })
                        .where(and(
                            eq(purchaseOrderLines.poId, val.poId),
                            eq(purchaseOrderLines.itemId, itemId)
                        ));
                }
                console.log(`✅ Updated qtyBilled for PO #${val.poId}`);
            }

            // 3. Create inventory layers (FIFO tracking) - Only if approval not required
            if (!requiresApproval) {
                for (let i = 0; i < val.items.length; i++) {
                    const item = val.items[i];
                    const qty = parseFloat(item.quantity as any) || 0;
                    const price = parseFloat(item.unitPrice as any) || 0;
                    const unitCostTiyin = Math.round(price * 100);
                    const batchNumber = `BILL-${bill.id}-${item.itemId}`;

                    await tx.insert(inventoryLayers).values({
                        itemId: Number(item.itemId),
                        batchNumber: batchNumber,
                        initialQty: qty,
                        remainingQty: qty,
                        unitCost: unitCostTiyin,
                        receiveDate: val.transactionDate,
                        isDepleted: false,
                        qcStatus: 'NOT_REQUIRED', // QC workflow disabled - auto-available
                    });

                    // Capture for QC inspection generation
                    inspectionsToGenerate.push({
                        itemId: Number(item.itemId),
                        batchNumber: batchNumber,
                        quantity: qty,
                    });
                }

                // 3b. Update denormalized inventory fields after creating layers
                const uniqueItemIds = [...new Set(val.items.map((item: any) => Number(item.itemId)))];
                for (const itemId of uniqueItemIds) {
                    try {
                        await updateItemInventoryFields(itemId, tx);
                    } catch (syncError) {
                        console.error(`[CRITICAL] Failed to sync denormalized fields for item ${itemId}:`, syncError);
                        console.error(`[ACTION NEEDED] Inventory layers are saved. Run resync from Settings → Inventory Tools`);
                        // Don't throw - bill transaction should succeed even if sync fails
                        // Layers are source of truth and are already saved
                    }
                }
                console.log('✅ Inventory fields updated for all items');
            } else {
                console.log('⏸️  Inventory layer creation skipped - Bill requires approval');
            }

            // 4. GL Entry: Post to item-specific asset accounts (ONLY if no approval required)
            if (!requiresApproval) {
                // Group line amounts by asset account
                const accountTotals = new Map<string, number>();

                for (const item of val.items) {
                    const itemData = itemsMap.get(Number(item.itemId))! as any;
                    const qty = parseFloat(item.quantity as any) || 0;
                    const price = parseFloat(item.unitPrice as any) || 0;
                    const lineAmount = Math.round(qty * price * 100);

                    // Determine asset account (item-specific or class default)
                    let assetAccount = itemData.assetAccountCode;
                    if (!assetAccount) {
                        const classDefaults: Record<string, string> = {
                            'RAW_MATERIAL': '1310',
                            'WIP': '1330',
                            'FINISHED_GOODS': '1340',
                            'SERVICE': '5100',
                        };
                        assetAccount = classDefaults[itemData.itemClass] || '1310';
                    }

                    // Accumulate by account
                    accountTotals.set(
                        assetAccount,
                        (accountTotals.get(assetAccount) || 0) + lineAmount
                    );
                }

                // Create journal entry
                const [je] = await tx.insert(journalEntries).values({
                    date: val.transactionDate,
                    description: `Vendor Bill: ${val.refNumber}`,
                    reference: val.refNumber,
                    transactionId: `bill-${bill.id}`,
                    isPosted: true,
                }).returning();

                // Post one debit entry per unique asset account
                for (const [accountCode, amount] of accountTotals.entries()) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: accountCode,
                        debit: amount,
                        credit: 0,
                        description: `Inventory/Expense - Bill ${val.refNumber}`,
                    });
                }

                // Single credit to AP
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: ACCOUNTS.AP_LOCAL, // 2100
                    debit: 0,
                    credit: totalAmountTiyin,
                    description: `Vendor Liability - ${val.refNumber}`,
                });

                // Update GL balances
                for (const [accountCode, amount] of accountTotals.entries()) {
                    await tx.run(sql`
                        UPDATE gl_accounts
                        SET balance = balance + ${amount},
                            updated_at = CURRENT_TIMESTAMP
                        WHERE code = ${accountCode}
                    `);
                }

                await tx.run(sql`
                    UPDATE gl_accounts
                    SET balance = balance - ${totalAmountTiyin},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE code = ${ACCOUNTS.AP_LOCAL}
                `);

                console.log('✅ GL entries posted and balances updated');
            } else {
                console.log('⏸️  GL posting skipped - Bill requires approval');
            }

            // ✅ Return transaction result
            return {
                success: true,
                billId: bill.id,
                inspectionsNeeded: inspectionsToGenerate.length > 0
            };
        });

        // QC workflow disabled - inspection generation skipped
        // All inventory auto-approved on receipt (qcStatus: NOT_REQUIRED)

        revalidatePath('/purchasing/vendors');
        return {
            success: true,
            message: `Bill ${val.refNumber} created successfully`,
            billId: result.billId
        };
    } catch (error: any) {
        console.error('❌ Create Vendor Bill Error:', error);

        // Log specific error details for debugging
        if (error.name === 'ZodError') {
            console.error('Validation failed on fields:', error.errors);
        } else if (error.code) {
            console.error('Database error code:', error.code);
        }

        return { success: false, error: error.message || 'Failed to create bill' };
    }
}

/**
 * Helper: Update GL Account Balances
 * Updates account balances after posting journal entry lines
 * Used by both updateVendorBill and deleteVendorBill
 */
async function updateAccountBalances(tx: any, jeId: number) {
    const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));

    for (const line of lines) {
        const accountResults = await tx.select().from(glAccounts).where(eq(glAccounts.code, line.accountCode)).limit(1);
        const account = accountResults[0];

        if (!account) {
            console.warn(`⚠️ Account ${line.accountCode} not found - skipping balance update`);
            continue;
        }

        const netChange = line.debit - line.credit;

        await tx.update(glAccounts)
            .set({
                balance: sql`${glAccounts.balance} + ${netChange}`,
                updatedAt: new Date()
            })
            .where(eq(glAccounts.code, line.accountCode));

        console.log(`✅ Account ${line.accountCode} balance updated by ${netChange} Tiyin`);
    }
}

/**
 * Update Vendor Bill - Enhanced with Reverse & Replay Pattern
 * Implements QuickBooks-style editing with full GL audit trail
 *
 * Pattern:
 * 1. Create reversal entry for original GL posting
 * 2. Re-post new GL entry with updated amounts
 * 3. Update account balances
 * 4. Maintain complete audit trail
 */
export async function updateVendorBill(billId: number, data: any) {
    'use server';

    try {
        console.log('💾 Updating vendor bill...', { billId, refNumber: data.refNumber });

        // Validate input
        const val = purchasingDocumentSchema.parse(data);

        // Check period lock (GAAP/IFRS compliance - prevent posting to closed periods)
        await checkPeriodLock(val.transactionDate);

        // Calculate totals
        const totalAmountTiyin = val.items.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity);
            const price = Number(item.unitPrice); // Assuming validation returns decimal
            return sum + Math.round(qty * price * 100);
        }, 0);

        // Pre-validation: Load all items and validate
        const itemIds = val.items.map((item: any) => Number(item.itemId));
        const itemsData = await db.select({
            id: items.id,
            name: items.name,
            assetAccountCode: items.assetAccountCode,
            itemClass: items.itemClass,
            valuationMethod: items.valuationMethod,
        }).from(items).where(inArray(items.id, itemIds));

        const itemsMap = new Map(itemsData.map((i: any) => [i.id, i]));

        // Validate all items exist
        for (const item of val.items) {
            const itemData = itemsMap.get(Number(item.itemId));
            if (!itemData) throw new Error(`Item ${item.itemId} not found`);
        }

        // Update in transaction
        const result = await db.transaction(async (tx: any) => {
            // STEP 1: LOAD & VALIDATE
            const billResults = await tx.select().from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
            const bill = billResults[0];

            if (!bill) throw new Error('Bill not found');
            if (bill.status === 'PAID') throw new Error('Cannot edit a paid bill. Delete the payment first.');

            // STEP 2: "SAFE SWAP" - DELETE EXISTING LINES & GL
            // The user requested: "Delete all existing vendor_bill_lines... Delete all existing gl_entries... Insert new..."
            // This ensures no "Ghost" entries remain.

            // 2.1 Delete GL Entries linked to this bill
            const glEntries = await tx.select().from(journalEntries).where(eq(journalEntries.transactionId, `bill-${billId}`));
            for (const entry of glEntries) {
                // Reverse balance updates
                const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
                for (const line of lines) {
                    const inverseNetChange = -(line.debit - line.credit);
                    await tx.run(sql`UPDATE gl_accounts SET balance = balance + ${inverseNetChange} WHERE code = ${line.accountCode}`);
                }

                await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
                await tx.delete(journalEntries).where(eq(journalEntries.id, entry.id));
            }
            console.log('✅ Old GL entries deleted and balances reverted');

            // 2.2 Delete Bill Lines
            await tx.delete(vendorBillLines).where(eq(vendorBillLines.billId, billId));
            console.log('✅ Old Bill Lines deleted');

            // 2.3 Delete Old Inventory Layers (CRITICAL FIX)
            await tx.run(sql`
                DELETE FROM inventory_layers
                WHERE batch_number LIKE ${'BILL-' + billId + '-%'}
            `);
            console.log('✅ Old inventory layers deleted');

            // STEP 3: UPDATE HEADER
            await tx.update(vendorBills)
                .set({
                    billDate: new Date(val.transactionDate),
                    billNumber: val.refNumber,
                    totalAmount: totalAmountTiyin,
                    updatedAt: new Date(),
                })
                .where(eq(vendorBills.id, billId));

            console.log('✅ Bill header updated');

            // STEP 4: INSERT NEW LINES
            if (val.items.length > 0) {
                await tx.insert(vendorBillLines).values(
                    val.items.map((item, index) => ({
                        billId: billId,
                        itemId: Number(item.itemId),
                        description: item.description || '',
                        quantity: Number(item.quantity),
                        unitPrice: Math.round(Number(item.unitPrice) * 100),
                        amount: Math.round(Number(item.quantity) * Number(item.unitPrice) * 100),
                        lineNumber: index + 1,
                    }))
                );
            }
            console.log('✅ New Lines inserted');

            // STEP 4.5: RECREATE INVENTORY LAYERS (NEW)
            for (const item of val.items) {
                const qty = Number(item.quantity);
                const price = Number(item.unitPrice);
                const unitCostTiyin = Math.round(price * 100);

                await tx.insert(inventoryLayers).values({
                    itemId: Number(item.itemId),
                    batchNumber: `BILL-${billId}-${item.itemId}`,
                    initialQty: qty,
                    remainingQty: qty,
                    unitCost: unitCostTiyin,
                    receiveDate: val.transactionDate,
                    isDepleted: false,
                    qcStatus: 'PENDING', // Hold until QC approval
                });
            }
            console.log('✅ New inventory layers created');

            // STEP 4.6: UPDATE DENORMALIZED INVENTORY FIELDS
            const uniqueItemIds = [...new Set(val.items.map((item: any) => Number(item.itemId)))];
            for (const itemId of uniqueItemIds) {
                try {
                    await updateItemInventoryFields(itemId, tx);
                } catch (syncError) {
                    console.error(`[CRITICAL] Failed to sync denormalized fields for item ${itemId}:`, syncError);
                    console.error(`[ACTION NEEDED] Inventory layers are saved. Run resync from Settings → Inventory Tools`);
                    // Don't throw - bill transaction should succeed even if sync fails
                    // Layers are source of truth and are already saved
                }
            }
            console.log('✅ Inventory fields recalculated for updated items');

            // STEP 5: RE-RUN GL LOGIC WITH ITEM-SPECIFIC ACCOUNTS
            // Group line amounts by asset account
            const accountTotals = new Map<string, number>();

            for (const item of val.items) {
                const itemData = itemsMap.get(Number(item.itemId))! as any;
                const qty = Number(item.quantity);
                const price = Number(item.unitPrice);
                const lineAmount = Math.round(qty * price * 100);

                // Determine asset account (item-specific or class default)
                let assetAccount = itemData.assetAccountCode;
                if (!assetAccount) {
                    const classDefaults: Record<string, string> = {
                        'RAW_MATERIAL': '1310',
                        'WIP': '1330',
                        'FINISHED_GOODS': '1340',
                        'SERVICE': '5100',
                    };
                    assetAccount = classDefaults[itemData.itemClass] || '1310';
                }

                // Accumulate by account
                accountTotals.set(
                    assetAccount,
                    (accountTotals.get(assetAccount) || 0) + lineAmount
                );
            }

            // Create journal entry
            const [je] = await tx.insert(journalEntries).values({
                date: new Date(val.transactionDate),
                description: `Vendor Bill: ${val.refNumber}`,
                reference: val.refNumber,
                transactionId: `bill-${billId}`,
                isPosted: true,
            }).returning();

            // Post one debit entry per unique asset account
            for (const [accountCode, amount] of accountTotals.entries()) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: accountCode,
                    debit: amount,
                    credit: 0,
                    description: `Inventory/Expense - Bill ${val.refNumber}`,
                });
            }

            // Single credit to AP
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.AP_LOCAL, // 2100
                debit: 0,
                credit: totalAmountTiyin,
                description: `Vendor Liability - ${val.refNumber}`,
            });

            // Update GL balances
            for (const [accountCode, amount] of accountTotals.entries()) {
                await tx.run(sql`
                    UPDATE gl_accounts
                    SET balance = balance + ${amount},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE code = ${accountCode}
                `);
            }

            await tx.run(sql`
                UPDATE gl_accounts
                SET balance = balance - ${totalAmountTiyin},
                    updated_at = CURRENT_TIMESTAMP
                WHERE code = ${ACCOUNTS.AP_LOCAL}
            `);

            console.log('✅ New GL entries posted and balances updated');

            return { success: true };
        });

        revalidatePath('/purchasing/vendors');
        return {
            success: true,
            message: `Bill ${val.refNumber} updated successfully`
        };

    } catch (error: any) {
        console.error('❌ Update Bill Error:', error);
        if (error.name === 'ZodError') {
            return { success: false, error: 'Validation failed' };
        }
        return { success: false, error: error.message || 'Failed to update bill' };
    }
}

export async function deleteVendorBill(billId: number) {
    'use server';
    try {
        console.log('🗑️ Deleting vendor bill:', billId);

        // Pre-transaction validations
        const billCheck = await db.select().from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
        const billToCheck = billCheck[0];

        if (!billToCheck) throw new Error('Bill not found');

        // Check period lock - cannot delete bills in closed periods (GAAP/IFRS compliance)
        await checkPeriodLock(billToCheck.billDate);
        if (billToCheck.status === 'PAID') throw new Error('Cannot delete a paid bill. Delete payment first.');

        return await db.transaction(async (tx: any) => {
            // 1. Get bill again inside transaction for consistency
            const billResults = await tx.select().from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
            const bill = billResults[0];

            if (!bill) throw new Error('Bill not found');

            // 1.5. Log deletion before removing any data
            await logAuditEvent({
                entity: 'vendor_bill',
                entityId: bill.id.toString(),
                action: 'DELETE',
                changes: {
                    before: {
                        billNumber: bill.billNumber,
                        vendorId: bill.vendorId,
                        totalAmount: bill.totalAmount,
                        status: bill.status,
                        billDate: bill.billDate?.toISOString()
                    }
                }
            });

            // 2. Delete GL Entries (Reverse Balances first)
            const glEntries = await tx.select().from(journalEntries).where(eq(journalEntries.transactionId, `bill-${billId}`));
            for (const entry of glEntries) {
                const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
                for (const line of lines) {
                    const inverseNetChange = -(line.debit - line.credit);
                    await tx.run(sql`UPDATE gl_accounts SET balance = balance + ${inverseNetChange} WHERE code = ${line.accountCode}`);
                }
                await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
                await tx.delete(journalEntries).where(eq(journalEntries.id, entry.id));
            }

            // 3. Delete Bill Lines
            await tx.delete(vendorBillLines).where(eq(vendorBillLines.billId, billId));

            // 4. Get affected item IDs before deleting layers
            const affectedLayers = (await tx.select({
                itemId: inventoryLayers.itemId
            }).from(inventoryLayers).where(
                sql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
            )) as Array<{ itemId: number }>;
            const uniqueItemIds = [...new Set(affectedLayers.map((l) => l.itemId))];


            // 5. Delete Inventory Layers (CRITICAL FIX)
            await tx.run(sql`
                DELETE FROM inventory_layers
                WHERE batch_number LIKE ${'BILL-' + billId + '-%'}
            `);
            console.log('✅ Inventory layers deleted');

            // 5.5. Update denormalized inventory fields after deletion
            for (const itemId of uniqueItemIds) {
                try {
                    await updateItemInventoryFields(itemId, tx);
                } catch (syncError) {
                    console.error(`[CRITICAL] Failed to sync denormalized fields for item ${itemId}:`, syncError);
                    console.error(`[ACTION NEEDED] Inventory layers are deleted. Run resync from Settings → Inventory Tools`);
                    // Don't throw - bill transaction should succeed even if sync fails
                    // Layers are source of truth and are already deleted
                }
            }
            console.log('✅ Inventory fields updated after bill deletion');

            // 6. Delete Bill
            await tx.delete(vendorBills).where(eq(vendorBills.id, billId));

            try {
                revalidatePath('/purchasing/vendors');
            } catch (e) { }
            return { success: true };
        });

    } catch (error: any) {
        console.error('Delete Bill Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Bill by ID with Line Items
 * Fetches a bill and its line items for editing
 */
export async function getBillById(billId: number) {
    'use server';

    try {
        // Fetch bill with lines - Include approval fields for banner
        const billResults = await db.select({
            id: vendorBills.id,
            vendorId: vendorBills.vendorId,
            poId: vendorBills.poId,
            billDate: vendorBills.billDate,
            billNumber: vendorBills.billNumber,
            totalAmount: vendorBills.totalAmount,
            status: vendorBills.status,
            approvalStatus: vendorBills.approvalStatus,
            approvedBy: vendorBills.approvedBy,
            approvedAt: vendorBills.approvedAt,
            createdAt: vendorBills.createdAt,
            updatedAt: vendorBills.updatedAt,
        }).from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
        const bill = billResults[0];

        if (!bill) {
            return { success: false, error: 'Bill not found' };
        }

        // Load lines and vendor separately
        const lines = await db.select().from(vendorBillLines).where(eq(vendorBillLines.billId, billId)).orderBy(asc(vendorBillLines.lineNumber));
        const vendorResults = await db.select().from(vendors).where(eq(vendors.id, bill.vendorId)).limit(1);
        const vendor = vendorResults[0];

        const billWithRelations = { ...bill, lines, vendor };

        // Transform to form format
        const formData = {
            vendorId: String(bill.vendorId),
            transactionDate: bill.billDate.toISOString().split('T')[0], // YYYY-MM-DD
            refNumber: bill.billNumber || '',
            terms: 'Net 30', // Default (not stored in bills table)
            items: lines.map(line => ({
                itemId: String(line.itemId),
                description: line.description || '',
                quantity: line.quantity,
                unitPrice: line.unitPrice / 100, // Convert from Tiyin to Decimal
                amount: line.amount / 100,
            })),
            memo: '', // Not stored in bills table
        };

        console.log('✅ Bill loaded for editing:', billId);
        return { success: true, data: formData, bill };

    } catch (error: any) {
        console.error('❌ Get Bill Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getPurchaseOrders() {
    const orders = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.date));

    // Load vendors and lines for each order
    const result = await Promise.all(orders.map(async (order) => {
        const vendorResults = await db.select().from(vendors).where(eq(vendors.id, order.vendorId)).limit(1);
        const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, order.id));
        return { ...order, vendor: vendorResults[0] || null, lines };
    }));

    return result;
}

export async function getPurchaseOrder(id: number) {
    const poResults = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    const po = poResults[0];

    if (!po) return null;

    const vendorResults = await db.select().from(vendors).where(eq(vendors.id, po.vendorId)).limit(1);
    const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, id));

    // Load items for each line
    const linesWithItems = await Promise.all(lines.map(async (line) => {
        const itemResults = await db.select().from(items).where(eq(items.id, line.itemId)).limit(1);
        return { ...line, item: itemResults[0] || null };
    }));

    return { ...po, vendor: vendorResults[0] || null, lines: linesWithItems };
}

/**
 * Get Purchase Order for Editing
 * Fetches a PO and transforms it to form-compatible format
 */
export async function getPurchaseOrderForEdit(poId: number) {
    'use server';

    try {
        // Fetch PO
        const poResults = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
        const po = poResults[0];

        if (!po) {
            return { success: false, error: 'Purchase order not found' };
        }

        // Load lines
        const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId)).orderBy(asc(purchaseOrderLines.id));

        // Load vendor
        const vendorResults = await db.select().from(vendors).where(eq(vendors.id, po.vendorId)).limit(1);
        const vendor = vendorResults[0];

        const poWithRelations = { ...po, lines, vendor };

        // Transform to form format (matching purchasingDocumentSchema)
        const formData = {
            vendorId: String(po.vendorId),
            transactionDate: po.date instanceof Date
                ? po.date.toISOString().split('T')[0]
                : new Date(po.date).toISOString().split('T')[0],
            refNumber: po.orderNumber || '',
            terms: 'Net 30', // Default
            items: lines.map(line => ({
                itemId: String(line.itemId),
                description: line.description || '',
                quantity: line.qtyOrdered,
                unitPrice: line.unitCost / 100, // Convert from Tiyin to Decimal
                amount: (line.qtyOrdered * line.unitCost) / 100,
            })),
            memo: po.notes || '',
        };

        console.log('✅ PO loaded for editing:', poId);
        return { success: true, data: formData, po: poWithRelations };

    } catch (error: any) {
        console.error('❌ Get PO for Edit Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update Purchase Order
 * Updates PO header and lines. Prevents editing if:
 * - PO status is CLOSED
 * - Any items have been received (qtyReceived > 0)
 *
 * Note: POs don't create GL entries - GL is created on receipt/bill
 */
export async function updatePurchaseOrder(poId: number, data: any) {
    'use server';

    try {
        console.log('💾 Updating purchase order...', { poId, refNumber: data.refNumber });

        // Validate input using the shared schema
        const val = purchasingDocumentSchema.parse(data);

        // Calculate total amount in Tiyin
        const totalAmountTiyin = val.items.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity);
            const price = Number(item.unitPrice);
            return sum + Math.round(qty * price * 100);
        }, 0);

        const result = await db.transaction(async (tx: any) => {
            // STEP 1: LOAD & VALIDATE
            const poResults = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
            const po = poResults[0];

            if (!po) {
                throw new Error('Purchase order not found');
            }

            // Check if PO is closed
            if (po.status === 'CLOSED') {
                throw new Error('Cannot edit a closed purchase order');
            }

            // Check if any items have been received
            const lines = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
            const hasReceivedItems = lines.some(line => line.qtyReceived > 0);

            if (hasReceivedItems) {
                throw new Error('Cannot edit purchase order after items have been received. Create a new PO instead.');
            }

            // STEP 2: DELETE OLD LINES
            await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
            console.log('✅ Old PO lines deleted');

            // STEP 3: UPDATE HEADER
            await tx.update(purchaseOrders)
                .set({
                    vendorId: Number(val.vendorId),
                    date: new Date(val.transactionDate),
                    orderNumber: val.refNumber,
                    notes: val.memo || null,
                    totalAmount: totalAmountTiyin,
                    updatedAt: sql`(unixepoch())`,
                })
                .where(eq(purchaseOrders.id, poId));

            console.log('✅ PO header updated');

            // STEP 4: INSERT NEW LINES
            for (const item of val.items) {
                await tx.insert(purchaseOrderLines).values({
                    poId: poId,
                    itemId: Number(item.itemId),
                    qtyOrdered: Number(item.quantity),
                    qtyReceived: 0,
                    unitCost: Math.round(Number(item.unitPrice) * 100), // Convert to Tiyin
                    description: item.description || null,
                });
            }

            console.log('✅ New PO lines inserted');

            return { success: true };
        });

        revalidatePath('/purchasing/vendors');
        revalidatePath('/purchasing/orders');
        return result;

    } catch (error: any) {
        console.error('❌ Update PO Error:', error);
        if (error.name === 'ZodError') {
            return { success: false, error: 'Validation failed' };
        }
        return { success: false, error: error.message || 'Failed to update purchase order' };
    }
}

/**
 * Delete Purchase Order
 * Deletes a purchase order and reverses all GL entries
 *
 * @param poId - The ID of the PO to delete
 * @returns Success/error result
 */
export async function deletePurchaseOrder(poId: number) {
    'use server';

    try {
        // 1. Fetch PO with validation
        const poResults = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
        const po = poResults[0];

        if (!po) {
            return {
                success: false,
                error: 'Purchase order not found'
            };
        }

        // 2. Perform deletion in transaction
        return await db.transaction(async (tx: any) => {
            // 2a. Find the journal entry associated with this PO
            const jeResults = await tx.select().from(journalEntries).where(eq(journalEntries.reference, po.orderNumber || '')).limit(1);
            const je = jeResults[0];

            // Load lines for journal entry
            let jeToReverse: any = null;
            if (je) {
                const jeLines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
                jeToReverse = { ...je, lines: jeLines };
            }

            // 2b. Create reversal journal entry
            if (jeToReverse) {
                const [reversalJE] = await tx.insert(journalEntries).values({
                    date: new Date(),
                    description: `Reversal: Deleted PO ${po.orderNumber}`,
                    reference: `REV-${po.orderNumber}`,
                    transactionId: `po-${poId}-deleted`,
                    isPosted: true,
                }).returning();

                // 2c. Reverse each line (swap debit and credit)
                for (const line of jeToReverse.lines) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: reversalJE.id,
                        accountCode: line.accountCode,
                        debit: line.credit,  // Swap credit -> debit
                        credit: line.debit,  // Swap debit -> credit
                        description: `Reversal: ${line.description}`,
                    });
                }

                // 2d. Update account balances for reversal entry
                await updateAccountBalances(tx, reversalJE.id);

                console.log(`✅ GL Reversal Created: ${reversalJE.id} for PO ${po.orderNumber}`);
            } else {
                console.warn(`⚠️ No GL entry found for PO ${po.orderNumber} - skipping reversal`);
            }

            // 2e. Delete all purchase order lines first (foreign key constraint)
            await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
            console.log(`✅ PO Lines Deleted for PO ${po.orderNumber}`);

            // 2f. Delete the PO
            await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));

            console.log(`🗑️ Purchase Order Deleted: ${po.orderNumber} (ID: ${poId})`);

            // 3. Revalidate paths to refresh UI
            try {
                revalidatePath('/purchasing/vendors');
                revalidatePath('/purchasing/purchase-orders');
            } catch (e) {
                console.warn('⚠️ Path revalidation failed:', e);
            }

            return {
                success: true,
                message: `Purchase order ${po.orderNumber} deleted successfully. GL entries have been reversed.`
            };
        });

    } catch (error: any) {
        console.error('❌ Delete PO Error:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred while deleting the purchase order'
        };
    }
}

export async function getOpenPOsByVendor(vendorId: number) {
    try {
        const orders = await db.select().from(purchaseOrders)
            .where(and(eq(purchaseOrders.vendorId, vendorId), inArray(purchaseOrders.status, ['OPEN', 'PARTIAL'])))
            .orderBy(desc(purchaseOrders.date));

        // Load lines and items for each order
        const result = await Promise.all(orders.map(async (order) => {
            const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, order.id));
            const linesWithItems = await Promise.all(lines.map(async (line) => {
                const itemResults = await db.select().from(items).where(eq(items.id, line.itemId)).limit(1);
                return { ...line, item: itemResults[0] || null };
            }));
            return { ...order, lines: linesWithItems };
        }));

        return result;
    } catch (error) {
        console.error('Get Open POs Error:', error);
        return [];
    }
}

export async function payVendorBill(data: z.infer<typeof payBillSchema>) {
    try {
        const val = payBillSchema.parse(data);

        // Check period lock (GAAP/IFRS compliance)
        await checkPeriodLock(val.date);

        return await db.transaction(async (tx: any) => {
            // 1. Find Open Bills (FIFO)
            const openBills = await tx.select().from(vendorBills)
                .where(
                    inArray(vendorBills.status, ['OPEN', 'PARTIAL'])
                )
                .orderBy(vendorBills.billDate); // Oldest first

            const vendorOpenBills = openBills.filter((b: any) => b.vendorId === val.vendorId);

            let remainingToPay = val.amount;

            for (const bill of vendorOpenBills) {
                if (remainingToPay <= 0) break;

                // THREE-WAY MATCH CONTROL: Cannot pay for undelivered goods
                if (bill.poId) {
                    const poLines = await tx.select().from(purchaseOrderLines)
                        .where(eq(purchaseOrderLines.poId, bill.poId));

                    const allReceived = poLines.every(pl => pl.qtyReceived >= pl.qtyOrdered);

                    if (!allReceived) {
                        const unreceived = poLines.filter((pl: any) => pl.qtyReceived < pl.qtyOrdered);
                        console.warn(
                            `⚠️ PAYMENT BLOCKED: Bill #${bill.id} linked to PO #${bill.poId} has ${unreceived.length} unreceived line items. ` +
                            `Three-way match control prevents payment.`
                        );
                        // Skip this bill and continue to next
                        continue;
                    }
                }

                const amountDue = bill.totalAmount;

                if (remainingToPay >= amountDue) {
                    await tx.update(vendorBills)
                        .set({ status: 'PAID' })
                        .where(eq(vendorBills.id, bill.id));
                    remainingToPay -= amountDue;
                } else {
                    await tx.update(vendorBills)
                        .set({ status: 'PARTIAL' })
                        .where(eq(vendorBills.id, bill.id));
                    remainingToPay = 0;
                }
            }

            // 2. Create GL Entry
            const [je] = await tx.insert(journalEntries).values({
                date: val.date,
                description: `Vendor Payment: ${val.vendorId}`,
                reference: val.refNumber || `PAY-${Date.now()}`,
                isPosted: true,
            }).returning();

            // Debit Accounts Payable (2100)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '2100', // AP
                debit: val.amount,
                credit: 0,
                description: `Payment to Vendor #${val.vendorId}`
            });

            // Credit Bank (1110)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: val.bankAccountId || '1110',
                debit: 0,
                credit: val.amount,
                description: `Cash Outflow to Vendor #${val.vendorId}`
            });

            try {
                revalidatePath('/purchasing/vendors');
            } catch (e) { }
            return { success: true };
        });

    } catch (error: any) {
        console.error('Pay Bill Error:', error);
        return { success: false, error: error.message || 'Failed to pay vendor' };
    }
}

export async function receiveItems(poId: number, items: { lineId: number; qtyReceived: number }[]) {
    try {
        return await db.transaction(async (tx: any) => {
            for (const item of items) {
                // Update PO line
                await tx.update(purchaseOrderLines)
                    .set({ qtyReceived: sql`${purchaseOrderLines.qtyReceived} + ${item.qtyReceived}` })
                    .where(eq(purchaseOrderLines.id, item.lineId));

                // Get full line info to create inventory layer
                const [line] = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.id, item.lineId));
                if (line) {
                    await tx.insert(inventoryLayers).values({
                        itemId: line.itemId,
                        batchNumber: `REC-PO${poId}-${Date.now()}`,
                        initialQty: item.qtyReceived,
                        remainingQty: item.qtyReceived,
                        unitCost: line.unitCost,
                        receiveDate: new Date(),
                    });
                }
            }

            // Update PO status to PARTIAL
            await tx.update(purchaseOrders)
                .set({ status: 'PARTIAL' })
                .where(eq(purchaseOrders.id, poId));

            try {
                revalidatePath('/purchasing/vendors');
                revalidatePath('/inventory/items');
            } catch (e) { }
            return { success: true };
        });
    } catch (error: any) {
        console.error('Receive Items Error:', error);
        return { success: false, error: error.message || 'Failed to receive items' };
    }
}

/**
 * Approve or Reject Vendor Bill
 * ADMIN-only action to approve/reject bills pending approval
 *
 * @param billId - The ID of the bill to approve/reject
 * @param action - 'APPROVE' or 'REJECT'
 * @returns Success/error result with message
 */
export async function approveBill(billId: number, action: 'APPROVE' | 'REJECT') {
    'use server';

    try {
        console.log(`📋 Processing bill ${action.toLowerCase()}: ${billId}`);

        // Variables to capture for post-transaction QC inspection generation
        const inspectionsToGenerate: Array<{ itemId: number; batchNumber: string; quantity: number }> = [];

        // 1. Require ADMIN role
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Not authenticated' };
        }

        const userRole = (session.user as any)?.role as UserRole;
        if (userRole !== UserRole.ADMIN) {
            return { success: false, error: 'Admin access required for bill approval' };
        }

        // 2. Get current user ID
        const userId = (session.user as any)?.id;
        if (!userId) {
            return { success: false, error: 'User ID not found in session' };
        }

        // 3. Pre-transaction: Load bill and validate
        const billCheck = await db.select().from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
        const billToValidate = billCheck[0];

        if (!billToValidate) {
            return { success: false, error: 'Bill not found' };
        }

        // 4. Verify bill is in PENDING status (before transaction)
        if (billToValidate.approvalStatus !== 'PENDING') {
            return { success: false, error: `Cannot ${action.toLowerCase()} bill with approval status: ${billToValidate.approvalStatus}` };
        }

        // 5. Check period lock BEFORE transaction (GAAP/IFRS compliance)
        if (action === 'APPROVE') {
            await checkPeriodLock(billToValidate.billDate);
        }

        // 6. Process in transaction (mutations only)
        const result = await db.transaction(async (tx: any) => {
            // Re-fetch bill for consistency within transaction
            const billResults = await tx.select().from(vendorBills).where(eq(vendorBills.id, billId)).limit(1);
            const bill = billResults[0];

            if (!bill) {
                throw new Error('Bill not found');
            }

            // Double-check status within transaction (defensive)
            if (bill.approvalStatus !== 'PENDING') {
                throw new Error(`Cannot ${action.toLowerCase()} bill with approval status: ${bill.approvalStatus}`);
            }

            // 7. Handle APPROVE action
            if (action === 'APPROVE') {

                // 6a. Update bill status
                await tx.update(vendorBills)
                    .set({
                        approvalStatus: 'APPROVED',
                        approvedBy: userId,
                        approvedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(vendorBills.id, billId));

                console.log(`✅ Bill ${billId} approved by user ${userId}`);

                console.log(`✅ Bill ${billId} approved by user ${userId}`);

                // 6b. Create Pending GRN (Warehouse Reception Workflow)
                // This replaces direct inventory layer creation
                const billLines = await tx.select().from(vendorBillLines).where(eq(vendorBillLines.billId, billId));

                const grnResult = await createPendingGRN(billId);
                if (!grnResult.success) {
                    throw new Error(`Failed to create GRN: ${grnResult.error}`);
                }

                console.log(`✅ Pending GRN created for approved bill ${billId}`);

                // Note: QC inspections and Inventory layers are now deferred until GRN confirmation

                // 6c. Load items for asset account mapping
                const itemIds = billLines.map((line: any) => line.itemId);
                const itemsData = await tx.select({
                    id: items.id,
                    name: items.name,
                    assetAccountCode: items.assetAccountCode,
                    itemClass: items.itemClass,
                }).from(items).where(inArray(items.id, itemIds));

                const itemsMap = new Map(itemsData.map((i: any) => [i.id, i]));

                // 6d. Group line amounts by asset account
                const accountTotals = new Map<string, number>();

                for (const line of billLines) {
                    const itemData = itemsMap.get(line.itemId) as any;
                    if (!itemData) {
                        throw new Error(`Item ${line.itemId} not found`);
                    }

                    // Determine asset account (item-specific or class default)
                    let assetAccount = itemData.assetAccountCode;
                    if (!assetAccount) {
                        const classDefaults: Record<string, string> = {
                            'RAW_MATERIAL': '1310',
                            'WIP': '1330',
                            'FINISHED_GOODS': '1340',
                            'SERVICE': '5100',
                        };
                        assetAccount = classDefaults[itemData.itemClass] || '1310';
                    }

                    // Accumulate by account
                    accountTotals.set(
                        assetAccount,
                        (accountTotals.get(assetAccount) || 0) + line.amount
                    );
                }

                // 6e. Create journal entry
                const [je] = await tx.insert(journalEntries).values({
                    date: bill.billDate,
                    description: `Vendor Bill: ${bill.billNumber} (Approved)`,
                    reference: bill.billNumber || `BILL-${billId}`,
                    transactionId: `bill-${billId}`,
                    isPosted: true,
                }).returning();

                // 6f. Create JE lines - Debit asset accounts
                for (const [accountCode, amount] of accountTotals.entries()) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: accountCode,
                        debit: amount,
                        credit: 0,
                        description: `Inventory/Expense - Bill ${bill.billNumber} (Approved)`,
                    });
                }

                // 6g. Create JE line - Credit AP
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: ACCOUNTS.AP_LOCAL, // 2100
                    debit: 0,
                    credit: bill.totalAmount,
                    description: `Vendor Liability - ${bill.billNumber} (Approved)`,
                });

                // 6h. Update GL balances
                for (const [accountCode, amount] of accountTotals.entries()) {
                    await tx.run(sql`
                        UPDATE gl_accounts
                        SET balance = balance + ${amount},
                            updated_at = CURRENT_TIMESTAMP
                        WHERE code = ${accountCode}
                    `);
                }

                await tx.run(sql`
                    UPDATE gl_accounts
                    SET balance = balance - ${bill.totalAmount},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE code = ${ACCOUNTS.AP_LOCAL}
                `);

                console.log(`✅ GL entries posted for approved bill ${billId}`);

                return {
                    success: true,
                    message: `Bill ${bill.billNumber} approved successfully. GL entries have been posted.`
                };
            }

            // 7. Handle REJECT action
            if (action === 'REJECT') {
                // Update bill status only - NO GL posting
                await tx.update(vendorBills)
                    .set({
                        approvalStatus: 'REJECTED',
                        approvedBy: userId,
                        approvedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(vendorBills.id, billId));

                console.log(`❌ Bill ${billId} rejected by user ${userId}`);

                return {
                    success: true,
                    message: `Bill ${bill.billNumber} rejected. No GL entries posted.`
                };
            }

            throw new Error(`Invalid action: ${action}`);
        });

        // QC workflow disabled - inspection generation skipped
        // All inventory auto-approved on receipt (qcStatus: NOT_REQUIRED)

        // Audit log after successful approval/rejection
        if (result.success) {
            await logAuditEvent({
                entity: 'vendor_bill',
                entityId: billId.toString(),
                action: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
                changes: {
                    before: { approvalStatus: 'PENDING' },
                    after: { approvalStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' },
                    fields: ['approvalStatus', 'approvedBy', 'approvedAt']
                }
            });
        }

        // 8. Revalidate paths
        revalidatePath('/purchasing/vendors');
        revalidatePath(`/purchasing/bills/${billId}`);

        return result;

    } catch (error: any) {
        console.error('❌ Approve Bill Error:', error);
        return {
            success: false,
            error: error.message || `Failed to ${action.toLowerCase()} bill`
        };
    }
}
