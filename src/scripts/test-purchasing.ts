
import { db } from '../../db';
import { createVendor, savePurchaseOrder, receiveItems } from '../app/actions/purchasing';
import { items, inventoryLayers, journalEntries, journalEntryLines, purchaseOrders, uoms, glAccounts, categories } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
    console.log('--- Starting Purchasing Flow Test ---');

    // 1. Create Vendor
    console.log('1. Creating Vendor...');
    const vendorRes = await createVendor({
        name: 'Test Supplier ' + Date.now(),
        currency: 'UZS'
    });
    if (!vendorRes.success || !vendorRes.vendor) throw new Error('Failed to create vendor: ' + vendorRes.error);
    const vendorId = vendorRes.vendor.id;
    console.log('   Vendor created:', vendorId);

    // 2. Fetch or Create Item
    console.log('2. Fetching Item...');
    const itemResults = await db.select().from(items).limit(1);
    let item = itemResults[0];

    if (!item) {
        console.log('   No items found. Creating test item...');

        // Get or create default category
        const categoryResults = await db.select().from(categories).where(eq(categories.name, 'Raw Materials')).limit(1);
        let category = categoryResults[0];
        if (!category) {
            [category] = await db.insert(categories).values({ name: 'Raw Materials', description: 'Raw materials', isActive: true }).returning();
        }

        const uomResults = await db.select().from(uoms).where(eq(uoms.name, 'Kilogram')).limit(1);
        let uom = uomResults[0];
        if (!uom) {
            const allUomResults = await db.select().from(uoms).limit(1);
            uom = allUomResults[0];
        }
        if (!uom) throw new Error('No UOMs found. Run seed-uoms first.');

        const [newItem] = await db.insert(items).values({
            name: 'Test Item ' + Date.now(),
            baseUomId: uom.id,
            standardCost: 5000,
            isActive: true,
            categoryId: category.id
        }).returning();
        item = newItem;
    }
    console.log('   Using Item:', item.id, item.name);

    // 3. Create PO
    console.log('3. Creating Purchase Order...');
    const poData = {
        vendorId,
        date: new Date(),
        orderNumber: 'PO-TEST-' + Date.now(),
        items: [
            { itemId: item.id, qty: 100, unitCost: 5000 } // 100 units @ 5000 UZS
        ]
    };
    const poRes = await savePurchaseOrder(poData as any);
    if (!poRes.success) throw new Error('Failed to create PO: ' + poRes.error);
    console.log('   PO Created:', poData.orderNumber);

    // 4. Get PO ID
    const poResults = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, poData.orderNumber)).limit(1);
    const po = poResults[0];
    if (!po) throw new Error('PO not found after creation');
    console.log('   PO ID:', po.id);

    // 5. Ensure GL Accounts Exist
    console.log('5. verifying GL Accounts...');
    const glAccountsList = await db.select().from(glAccounts);
    if (!glAccountsList.find(a => a.code === '1310')) {
        await db.insert(glAccounts).values({
            code: '1310', name: 'Raw Materials', type: 'ASSET'
        });
    }
    if (!glAccountsList.find(a => a.code === '2110')) {
        await db.insert(glAccounts).values({
            code: '2110', name: 'Accrued Inventory', type: 'LIABILITY'
        });
    }

    // 6. Receive Items (Partial)
    console.log('6. Receiving 60 items...');
    // Need to fetch purchase order lines
    const { purchaseOrderLines } = await import('../../db/schema');
    const poLinesResults = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
    if (!poLinesResults[0]) throw new Error('No PO lines found');
    const lineId = poLinesResults[0].id;
    const receiveRes = await receiveItems(po.id, [
        { lineId, qtyReceived: 60 }
    ]);
    if (!receiveRes.success) throw new Error('Failed to receive items: ' + receiveRes.error);
    console.log('   Items Received.');

    // 7. Verify Database State
    console.log('7. Verifying Database State...');

    // a. Inventory Layer
    const layerResults = await db.select().from(inventoryLayers).where(eq(inventoryLayers.itemId, item.id)).orderBy(desc(inventoryLayers.receiveDate)).limit(1);
    const layer = layerResults[0];
    console.log('   Inventory Layer:', layer ? `Qty: ${layer.remainingQty}, Cost: ${layer.unitCost}` : 'NOT FOUND');
    if (!layer || layer.initialQty !== 60) throw new Error('Inventory Layer verification failed');

    // b. Journal Entry
    const jeResults = await db.select().from(journalEntries).where(eq(journalEntries.reference, po.orderNumber)).limit(1);
    const je = jeResults[0];
    console.log('   Journal Entry:', je ? `Date: ${je.date}` : 'NOT FOUND');
    if (!je) throw new Error('Journal Entry not created');

    const jeLinesList = await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
    const dr = jeLinesList.find(l => l.debit > 0);
    const cr = jeLinesList.find(l => l.credit > 0);
    console.log(`   Debit: ${dr?.accountCode} amount ${dr?.debit}`);
    console.log(`   Credit: ${cr?.accountCode} amount ${cr?.credit}`);

    // Expect 60 * 5000 = 300,000
    if (dr?.debit !== 300000 || cr?.credit !== 300000) {
        throw new Error(`Financials mismatch. Expected 300,000. Got Dr: ${dr?.debit}, Cr: ${cr?.credit}`);
    }

    console.log('--- Test PASSED Successfully ---');
}

main().catch(console.error);
