import { db } from '../../db';
import { vendors, vendorBills, purchaseOrders, purchaseOrderLines } from '../../db/schema/purchasing';
import { items, inventoryLayers, uoms, categories } from '../../db/schema/inventory';
import { invoiceLines } from '../../db/schema/sales';
import { bomItems } from '../../db/schema/manufacturing_bom';
import { productionInputs, productionOutputs } from '../../db/schema/production';
import { eq, sql } from 'drizzle-orm';

// --- MOCKED ACTIONS (Logic Copy without Next.js dependencies) ---

async function deleteVendor(id: number) {
    try {
        // Check usage
        const bills = await db.select({ count: sql<number>`count(*)` }).from(vendorBills).where(eq(vendorBills.vendorId, id));
        const pos = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.vendorId, id));

        const usageCount = (bills[0]?.count || 0) + (pos[0]?.count || 0);

        if (usageCount > 0) {
            // Archive
            await db.update(vendors).set({ status: 'ARCHIVED' }).where(eq(vendors.id, id));
            return { success: true, message: 'Vendor archived because they have existing records.', action: 'ARCHIVED' };
        } else {
            // Hard Delete
            await db.delete(vendors).where(eq(vendors.id, id));
            return { success: true, message: 'Vendor permanently deleted.', action: 'DELETED' };
        }
    } catch (e) {
        console.error('Delete Vendor Error:', e);
        return { success: false, message: 'Failed to delete vendor', action: 'ERROR' };
    }
}

async function deleteItem(id: number) {
    try {
        // Check usage across system
        const poLines = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrderLines).where(eq(purchaseOrderLines.itemId, id));
        const invLines = await db.select({ count: sql<number>`count(*)` }).from(invoiceLines).where(eq(invoiceLines.itemId, id));
        const boms = await db.select({ count: sql<number>`count(*)` }).from(bomItems).where(eq(bomItems.componentItemId, id));
        const prodIn = await db.select({ count: sql<number>`count(*)` }).from(productionInputs).where(eq(productionInputs.itemId, id));
        const prodOut = await db.select({ count: sql<number>`count(*)` }).from(productionOutputs).where(eq(productionOutputs.itemId, id));
        const layers = await db.select({ count: sql<number>`count(*)` }).from(inventoryLayers).where(eq(inventoryLayers.itemId, id));

        const usageCount =
            (poLines[0]?.count || 0) +
            (invLines[0]?.count || 0) +
            (boms[0]?.count || 0) +
            (prodIn[0]?.count || 0) +
            (prodOut[0]?.count || 0) +
            (layers[0]?.count || 0);

        if (usageCount > 0) {
            // Archive
            await db.update(items).set({ status: 'ARCHIVED' }).where(eq(items.id, id));
            return { success: true, message: 'Item archived due to existing history.', action: 'ARCHIVED' };
        } else {
            // Hard Delete
            await db.delete(items).where(eq(items.id, id));
            return { success: true, message: 'Item permanently deleted.', action: 'DELETED' };
        }

    } catch (e) {
        console.error('Delete Item Error:', e);
        return { success: false, message: 'Failed to delete item', action: 'ERROR' };
    }
}

// --- TEST RUNNER ---

async function test() {
    console.log('🧪 Testing Smart Delete Logic...');

    // --- VENDOR TESTING ---
    console.log('\n--- VENDOR TEST ---');

    // 1. Create Vendor A (For Archive)
    const [vendorA] = await db.insert(vendors).values({
        name: 'Test Vendor A (Archive)',
        currency: 'UZS',
        isActive: true,
        status: 'ACTIVE'
    }).returning();
    console.log('Created Vendor A:', vendorA.id);

    // 2. Create History for Vendor A
    const [po] = await db.insert(purchaseOrders).values({
        vendorId: vendorA.id,
        date: new Date(),
        orderNumber: `TEST-PO-${Date.now()}`,
        status: 'OPEN',
        totalAmount: 100
    }).returning();

    // 3. Create Vendor B (For Delete)
    const [vendorB] = await db.insert(vendors).values({
        name: 'Test Vendor B (Delete)',
        currency: 'UZS',
        isActive: true,
        status: 'ACTIVE'
    }).returning();
    console.log('Created Vendor B:', vendorB.id);

    // 4. Try Delete A
    console.log('Attempting to delete Vendor A...');
    const resA = await deleteVendor(vendorA.id);
    console.log('Result A:', resA.action); // Expect ARCHIVED

    // 5. Try Delete B
    console.log('Attempting to delete Vendor B...');
    const resB = await deleteVendor(vendorB.id);
    console.log('Result B:', resB.action); // Expect DELETED

    // 6. Verify DB
    const checkA = await db.select().from(vendors).where(eq(vendors.id, vendorA.id));
    const checkB = await db.select().from(vendors).where(eq(vendors.id, vendorB.id));

    console.log('DB Check A Status:', checkA[0]?.status);
    console.log('DB Check B Exists:', checkB.length > 0);

    if (checkA[0]?.status === 'ARCHIVED' && checkB.length === 0) {
        console.log('✅ Vendor Logic Passed');
    } else {
        console.error('❌ Vendor Logic Failed');
    }

    // --- ITEM TESTING ---
    console.log('\n--- ITEM TEST ---');

    // Get or create default category
    const catResults = await db.select().from(categories).where(eq(categories.name, 'Raw Materials')).limit(1);
    let category = catResults[0];
    if (!category) {
        [category] = await db.insert(categories).values({ name: 'Raw Materials', description: 'Raw materials', isActive: true }).returning();
    }
    const categoryId = category.id;

    // Fetch valid UOM
    const uom = await db.select().from(uoms).limit(1);
    // if (!uom[0]) throw new Error("No UOMs found in DB. Run seed script first.");
    // Force ID 1 if not found, or use found
    const uomId = uom[0]?.id || 1;
    console.log('Using UOM ID:', uomId);

    // 1. Create Item A (For Archive via PO Line)
    const [itemA] = await db.insert(items).values({
        name: 'Test Item A',
        type: 'Inventory',
        categoryId: categoryId,
        baseUomId: uomId,
        status: 'ACTIVE'
    }).returning();
    console.log('Created Item A:', itemA.id);

    // 2. Create usage (PO Line)
    await db.insert(purchaseOrderLines).values({
        poId: po.id,
        itemId: itemA.id,
        qtyOrdered: 10,
        qtyReceived: 0,
        unitCost: 100,
    });
    console.log('Created usage for Item A');

    // 3. Create Item B (For Delete)
    const [itemB] = await db.insert(items).values({
        name: 'Test Item B',
        type: 'Inventory',
        categoryId: categoryId,
        baseUomId: uomId,
        status: 'ACTIVE'
    }).returning();
    console.log('Created Item B:', itemB.id);

    // 4. Delete A
    console.log('Deleting Item A...');
    const resItemA = await deleteItem(itemA.id);
    console.log('Result Item A:', resItemA.action);

    // 5. Delete B
    console.log('Deleting Item B...');
    const resItemB = await deleteItem(itemB.id);
    console.log('Result Item B:', resItemB.action);

    // 6. Verify
    const checkItemA = await db.select().from(items).where(eq(items.id, itemA.id));
    const checkItemB = await db.select().from(items).where(eq(items.id, itemB.id));

    console.log('DB Check Item A Status:', checkItemA[0]?.status);
    console.log('DB Check Item B Exists:', checkItemB.length > 0);

    if (checkItemA[0]?.status === 'ARCHIVED' && checkItemB.length === 0) {
        console.log('✅ Item Logic Passed');
    } else {
        console.error('❌ Item Logic Failed');
    }
}

test().then(() => {
    console.log('Done');
    process.exit(0);
});
