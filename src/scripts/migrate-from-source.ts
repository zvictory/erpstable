import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { resolve } from 'path';

// Source DB Configuration
const SOURCE_DB_PATH = '/Users/zafar/downloads/laza-project/db/data.db';

async function main() {
    console.log('🚀 Starting migration from source:', SOURCE_DB_PATH);

    // Initialize Source DB Client
    const sourceClient = createClient({ url: `file:${SOURCE_DB_PATH}` });
    // We use the same schema assumption
    const sourceDb = drizzle(sourceClient, { schema });

    try {
        // 1. UOMs
        console.log('📦 Migrating UOMs...');
        const sourceUoms = await sourceDb.select().from(schema.uoms);
        if (sourceUoms.length > 0) {
            await db.insert(schema.uoms).values(sourceUoms).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceUoms.length} UOMs`);

        // 2. UOM Conversions
        console.log('🔄 Migrating UOM Conversions...');
        try {
            const sourceConversions = await sourceDb.select().from(schema.uomConversions);
            if (sourceConversions.length > 0) {
                await db.insert(schema.uomConversions).values(sourceConversions).onConflictDoNothing();
            }
            console.log(`✅ Migrated ${sourceConversions.length} UOM Conversions`);
        } catch (e) {
            console.warn('⚠️ Could not migrate UOM Conversions (might not exist in source or schema mismatch)');
        }

        // 3. Categories
        console.log('📂 Migrating Categories...');
        const sourceCategories = await sourceDb.select().from(schema.categories);
        if (sourceCategories.length > 0) {
            await db.insert(schema.categories).values(sourceCategories).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceCategories.length} Categories`);

        // 4. Vendors (DEBUGGING)
        console.log('🤝 Migrating Vendors...');
        const sourceVendors = await sourceDb.select().from(schema.vendors);
        if (sourceVendors.length > 0) {
            console.log(`Checking ${sourceVendors.length} vendors for invalid data...`);

            // Clean/Validate data
            const sanitizedVendors = sourceVendors.map(v => {
                const newV = { ...v };
                // Fix Invalid Dates
                if (newV.createdAt instanceof Date && isNaN(newV.createdAt.getTime())) {
                    console.warn(`Vendor ${v.id} has invalid createdAt, resetting to now`);
                    newV.createdAt = new Date();
                }
                if (newV.updatedAt instanceof Date && isNaN(newV.updatedAt.getTime())) {
                    console.warn(`Vendor ${v.id} has invalid updatedAt, resetting to now`);
                    newV.updatedAt = new Date();
                }
                return newV;
            });

            // Try inserting one by one if batch fails, or just try batch with cleaned data
            try {
                await db.insert(schema.vendors).values(sanitizedVendors).onConflictDoNothing();
            } catch (err) {
                console.error('Batch insert failed, inspecting items...');
                for (const v of sanitizedVendors) {
                    try {
                        await db.insert(schema.vendors).values(v).onConflictDoNothing();
                    } catch (innerErr) {
                        console.error(`Failed to insert vendor ${v.id} (${v.name}):`, innerErr);
                    }
                }
                throw err; // Re-throw to stop if needed, or continue
            }
        }
        console.log(`✅ Migrated ${sourceVendors.length} Vendors`);

        // 5. Items (Sanitized)
        console.log('🛠️ Migrating Items...');
        const sourceItems = await sourceDb.select().from(schema.items);
        if (sourceItems.length > 0) {
            const sanitizedItems = sourceItems.map(i => {
                const newI = { ...i };
                if (newI.createdAt instanceof Date && isNaN(newI.createdAt.getTime())) newI.createdAt = new Date();
                if (newI.updatedAt instanceof Date && isNaN(newI.updatedAt.getTime())) newI.updatedAt = new Date();
                return newI;
            });
            await db.insert(schema.items).values(sanitizedItems).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceItems.length} Items`);

        // 6. Inventory Layers
        console.log('📚 Migrating Inventory Layers...');
        // Use raw SQL to avoid selecting columns that don't exist in source (e.g. warehouse_id)
        const sourceLayers = await sourceDb.all(sql`SELECT * FROM inventory_layers`);

        if (sourceLayers.length > 0) {
            const sanitizedLayers = sourceLayers.map((l: any) => {
                return {
                    id: l.id,
                    itemId: l.item_id,
                    batchNumber: l.batch_number,
                    initialQty: l.initial_qty,
                    remainingQty: l.remaining_qty,
                    unitCost: l.unit_cost,
                    isDepleted: Boolean(l.is_depleted),
                    version: l.version || 1,
                    receiveDate: (l.receive_date && !isNaN(new Date(l.receive_date).getTime())) ? new Date(l.receive_date) : new Date(),
                    createdAt: (l.created_at && !isNaN(new Date(l.created_at).getTime())) ? new Date(l.created_at) : new Date(),
                    updatedAt: (l.updated_at && !isNaN(new Date(l.updated_at).getTime())) ? new Date(l.updated_at) : new Date(),
                };
            });
            await db.insert(schema.inventoryLayers).values(sanitizedLayers).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceLayers.length} Inventory Layers`);

        // 7. Purchase Orders
        console.log('📜 Migrating Purchase Orders...');
        const sourcePOs = await sourceDb.select().from(schema.purchaseOrders);
        if (sourcePOs.length > 0) {
            const sanitizedPOs = sourcePOs.map(p => {
                const newP = { ...p };
                if (newP.createdAt instanceof Date && isNaN(newP.createdAt.getTime())) newP.createdAt = new Date();
                if (newP.updatedAt instanceof Date && isNaN(newP.updatedAt.getTime())) newP.updatedAt = new Date();
                if (newP.date instanceof Date && isNaN(newP.date.getTime())) newP.date = new Date();
                if (newP.expectedDate instanceof Date && isNaN(newP.expectedDate.getTime())) newP.expectedDate = null; // or new Date()
                return newP;
            });
            await db.insert(schema.purchaseOrders).values(sanitizedPOs).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourcePOs.length} Purchase Orders`);

        // 8. Purchase Order Lines
        console.log('📝 Migrating Purchase Order Lines...');
        const sourcePOLines = await sourceDb.select().from(schema.purchaseOrderLines);
        if (sourcePOLines.length > 0) {
            await db.insert(schema.purchaseOrderLines).values(sourcePOLines).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourcePOLines.length} Purchase Order Lines`);

        // 9. Vendor Bills
        console.log('🧾 Migrating Vendor Bills...');
        const sourceBills = await sourceDb.select().from(schema.vendorBills);
        if (sourceBills.length > 0) {
            const sanitizedBills = sourceBills.map(b => {
                const newB = { ...b };
                if (newB.createdAt instanceof Date && isNaN(newB.createdAt.getTime())) newB.createdAt = new Date();
                if (newB.updatedAt instanceof Date && isNaN(newB.updatedAt.getTime())) newB.updatedAt = new Date();
                if (newB.billDate instanceof Date && isNaN(newB.billDate.getTime())) newB.billDate = new Date();
                if (newB.dueDate instanceof Date && isNaN(newB.dueDate.getTime())) newB.dueDate = null;
                return newB;
            });
            await db.insert(schema.vendorBills).values(sanitizedBills).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceBills.length} Vendor Bills`);

        // 10. Vendor Bill Lines
        console.log('🔢 Migrating Vendor Bill Lines...');
        const sourceBillLines = await sourceDb.select().from(schema.vendorBillLines);
        if (sourceBillLines.length > 0) {
            const sanitizedBillLines = sourceBillLines.map(bl => {
                const newBl = { ...bl };
                if (newBl.createdAt instanceof Date && isNaN(newBl.createdAt.getTime())) newBl.createdAt = new Date();
                return newBl;
            });
            await db.insert(schema.vendorBillLines).values(sanitizedBillLines).onConflictDoNothing();
        }
        console.log(`✅ Migrated ${sourceBillLines.length} Vendor Bill Lines`);

        console.log('✨ Data migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
