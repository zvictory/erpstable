import { db } from '../db';
import { vendors, vendorBills, vendorBillLines } from '../db/schema/purchasing';
import { items } from '../db/schema/inventory';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';

interface VendorRow {
    id: string;
    name: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    currency: string;
    paymentTerms: string;
    status: string;
    isActive: string;
    createdAt: string;
    updatedAt: string;
}

interface ItemRow {
    id: string;
    name: string;
    sku: string;
    description: string;
    type: string;
    categoryId: string;
    parentId: string;
    baseUomId: string;
    purchaseUomId: string;
    standardCost: string;
    salesPrice: string;
    reorderPoint: string;
    incomeAccountCode: string;
    status: string;
    isActive: string;
    version: string;
    createdAt: string;
    updatedAt: string;
}

interface BillRow {
    'Bill ID': string;
    'Ref Number': string;
    'Date': string;
    'Vendor': string;
    'Total Amount': string;
    'Item': string;
    'Qty': string;
    'Unit Price': string;
    'Line Amount': string;
}

async function importData() {
    console.log('🚀 Starting data import...\n');

    // Read CSV files
    const vendorsPath = path.join(process.cwd(), 'exports', 'vendors.csv');
    const itemsPath = path.join(process.cwd(), 'items_export.csv');
    const billsPath = path.join(process.cwd(), 'bills_export.csv');

    console.log('📂 Reading CSV files...');

    const vendorsCSV = fs.readFileSync(vendorsPath, 'utf-8');
    const itemsCSV = fs.readFileSync(itemsPath, 'utf-8');
    const billsCSV = fs.readFileSync(billsPath, 'utf-8');

    const vendorRows: VendorRow[] = parse(vendorsCSV, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
    });
    const itemRows: ItemRow[] = parse(itemsCSV, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
    });
    const billRows: BillRow[] = parse(billsCSV, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
    });

    console.log(`  ✓ Found ${vendorRows.length} vendors`);
    console.log(`  ✓ Found ${itemRows.length} items`);
    console.log(`  ✓ Found ${billRows.length} bill lines\n`);

    // Track ID mappings (old ID -> new ID)
    const vendorIdMap = new Map<number, number>();
    const itemIdMap = new Map<number, number>();

    // 1. Import Vendors
    console.log('👥 Importing vendors...');
    for (const row of vendorRows) {
        const oldId = parseInt(row.id);

        // Check if vendor already exists by name
        const existing = await db.select().from(vendors).where(eq(vendors.name, row.name.trim())).limit(1);

        if (existing.length > 0) {
            console.log(`  ⏭  Vendor "${row.name.trim()}" already exists (ID: ${existing[0].id})`);
            vendorIdMap.set(oldId, existing[0].id);
        } else {
            const [inserted] = await db.insert(vendors).values({
                name: row.name.trim(),
                taxId: row.taxId || null,
                email: row.email || null,
                phone: row.phone || null,
                address: row.address || null,
                currency: row.currency || 'UZS',
                paymentTerms: row.paymentTerms || null,
                status: (row.status || 'ACTIVE') as 'ACTIVE' | 'ARCHIVED',
                isActive: row.isActive === 'true',
            }).returning();

            vendorIdMap.set(oldId, inserted.id);
            console.log(`  ✓ Imported vendor "${row.name.trim()}" (Old ID: ${oldId} -> New ID: ${inserted.id})`);
        }
    }

    // 2. Import Items
    console.log('\n📦 Importing items...');
    for (const row of itemRows) {
        const oldId = parseInt(row.id);

        // Check if item already exists by name
        const existing = await db.select().from(items).where(eq(items.name, row.name.trim())).limit(1);

        if (existing.length > 0) {
            console.log(`  ⏭  Item "${row.name.trim()}" already exists (ID: ${existing[0].id})`);
            itemIdMap.set(oldId, existing[0].id);
        } else {
            try {
                const [inserted] = await db.insert(items).values({
                    name: row.name.trim(),
                    sku: row.sku !== 'null' && row.sku ? row.sku : null,
                    description: row.description !== 'null' && row.description ? row.description : null,
                    type: row.type as any,
                    categoryId: row.categoryId ? parseInt(row.categoryId) : null,
                    parentId: row.parentId !== 'null' && row.parentId ? parseInt(row.parentId) : null,
                    baseUomId: row.baseUomId ? parseInt(row.baseUomId) : null,
                    purchaseUomId: row.purchaseUomId !== 'null' && row.purchaseUomId ? parseInt(row.purchaseUomId) : null,
                    standardCost: parseInt(row.standardCost) || 0,
                    salesPrice: parseInt(row.salesPrice) || 0,
                    reorderPoint: parseInt(row.reorderPoint) || 0,
                    incomeAccountCode: row.incomeAccountCode !== 'null' && row.incomeAccountCode ? row.incomeAccountCode : null,
                    status: (row.status || 'ACTIVE') as 'ACTIVE' | 'ARCHIVED',
                    isActive: row.isActive === 'true',
                }).returning();

                itemIdMap.set(oldId, inserted.id);
                console.log(`  ✓ Imported item "${row.name.trim()}" (Old ID: ${oldId} -> New ID: ${inserted.id})`);
            } catch (error: any) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    console.log(`  ⚠  Skipping item "${row.name.trim()}": Duplicate SKU or constraint violation`);
                    // Try to find the item by SKU or just skip
                    const skuMatch = row.sku !== 'null' && row.sku ? await db.select().from(items).where(eq(items.sku, row.sku)).limit(1) : [];
                    if (skuMatch.length > 0) {
                        itemIdMap.set(oldId, skuMatch[0].id);
                    }
                } else {
                    throw error;
                }
            }
        }
    }

    // 3. Import Bills
    console.log('\n💰 Importing bills...');

    // Group bill lines by Bill ID
    const billsMap = new Map<string, BillRow[]>();
    for (const row of billRows) {
        const billId = row['Bill ID'];
        if (!billsMap.has(billId)) {
            billsMap.set(billId, []);
        }
        billsMap.get(billId)!.push(row);
    }

    console.log(`  Found ${billsMap.size} unique bills\n`);

    for (const [billId, lines] of billsMap) {
        const firstLine = lines[0];
        const vendorName = firstLine.Vendor.trim();
        const billDate = new Date(firstLine.Date);
        const totalAmount = parseInt(firstLine['Total Amount']) || 0;

        // Find vendor by name
        const vendor = await db.select().from(vendors).where(eq(vendors.name, vendorName)).limit(1);

        if (vendor.length === 0) {
            console.log(`  ⚠  Skipping bill ${billId}: Vendor "${vendorName}" not found`);
            continue;
        }

        const vendorId = vendor[0].id;

        // Check if bill already exists (by vendor, date, and amount)
        const existingBill = await db.select()
            .from(vendorBills)
            .where(eq(vendorBills.vendorId, vendorId))
            .limit(1);

        // For simplicity, let's check if a bill with same total exists
        const duplicateBill = existingBill.find(b =>
            b.totalAmount === totalAmount &&
            new Date(b.billDate).toDateString() === billDate.toDateString()
        );

        if (duplicateBill) {
            console.log(`  ⏭  Bill ${billId} (${vendorName}, ${totalAmount}) already exists`);
            continue;
        }

        // Create the bill
        const [insertedBill] = await db.insert(vendorBills).values({
            vendorId,
            billDate,
            dueDate: new Date(billDate.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
            billNumber: firstLine['Ref Number'] !== 'undefined' ? firstLine['Ref Number'] : `BILL-${billId}`,
            totalAmount,
            status: 'OPEN',
        }).returning();

        console.log(`  ✓ Created bill ${billId} for ${vendorName} (${totalAmount / 100} UZS)`);

        // Insert bill lines
        let lineNumber = 1;
        for (const line of lines) {
            // Skip empty lines
            if (!line.Item || line.Item.trim() === '') {
                continue;
            }

            const itemName = line.Item.trim();
            const item = await db.select().from(items).where(eq(items.name, itemName)).limit(1);

            if (item.length === 0) {
                console.log(`    ⚠  Skipping line: Item "${itemName}" not found`);
                continue;
            }

            const quantity = parseInt(line.Qty) || 0;
            const unitPrice = parseInt(line['Unit Price']) || 0;
            const amount = parseInt(line['Line Amount']) || 0;

            await db.insert(vendorBillLines).values({
                billId: insertedBill.id,
                itemId: item[0].id,
                description: itemName,
                quantity,
                unitPrice,
                amount,
                lineNumber,
            });

            console.log(`    → Line ${lineNumber}: ${itemName} (${quantity} @ ${unitPrice / 100})`);
            lineNumber++;
        }
    }

    console.log('\n✅ Import completed successfully!');
}

importData()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Import failed:', error);
        process.exit(1);
    });
