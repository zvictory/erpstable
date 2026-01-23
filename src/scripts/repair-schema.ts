import { db } from '../../db';
import { sql } from 'drizzle-orm';

async function repair() {
    console.log('🔧 Repairing Database Schema...');

    // Disable FKs
    await db.run(sql`PRAGMA foreign_keys = OFF`);

    const tables = [
        'routings',
        'work_orders',
        'bom_headers',
        'bom_items',
        'purchase_order_lines',
        'production_inputs',
        'production_outputs',
        'invoice_lines',
        'inventory_layers'
    ];

    try {
        for (const table of tables) {
            console.log(`Processing ${table}...`);

            // Get current CREATE definition
            const res = await db.run(sql.raw(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`));
            const createSql = res.rows[0]?.sql as string;

            if (createSql && createSql.includes('__old_push_items')) {
                console.log(`  Found reference to __old_push_items in ${table}`);

                // 1. Rename current table
                await db.run(sql.raw(`ALTER TABLE "${table}" RENAME TO "${table}_old"`));

                // 2. Create new table with updated FK (Replace string)
                const newSql = createSql.replace(/"?__old_push_items"?/g, '"items"');
                await db.run(sql.raw(newSql));

                // 3. Copy data
                await db.run(sql.raw(`INSERT INTO "${table}" SELECT * FROM "${table}_old"`));

                // 4. Drop old
                await db.run(sql.raw(`DROP TABLE "${table}_old"`));

                console.log(`  Fixed ${table}`);
            } else {
                console.log(`  No reference found or table missing.`);
            }
        }

        // Drop the ghost table finally
        await db.run(sql`DROP TABLE IF EXISTS "__old_push_items"`);
        console.log('Dropped __old_push_items');

    } catch (e) {
        console.error('Repair failed:', e);
    } finally {
        await db.run(sql`PRAGMA foreign_keys = ON`);
    }
}

repair().then(() => {
    console.log('✅ Repair complete');
    process.exit(0);
});
