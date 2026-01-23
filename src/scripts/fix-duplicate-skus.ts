import { db } from '../../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🔍 Checking for duplicate SKUs...');

    const duplicates = await db.run(sql`
        SELECT sku, COUNT(*) as count 
        FROM items 
        WHERE sku IS NOT NULL 
        GROUP BY sku 
        HAVING count > 1
    `);

    if (duplicates.rows.length === 0) {
        console.log('✅ No duplicate SKUs found.');
    } else {
        console.log(`⚠️ Found ${duplicates.rows.length} duplicate SKUs.`);

        for (const row of duplicates.rows) {
            const sku = row.sku as string;
            console.log(`  Fixing SKU: ${sku}`);

            // Get all items with this SKU
            const items = await db.run(sql`SELECT id FROM items WHERE sku = ${sku} ORDER BY id ASC`);

            // Skip the first one (keep original), update others
            for (let i = 1; i < items.rows.length; i++) {
                const itemId = items.rows[i].id;
                const newSku = `${sku}-dup-${i}`;
                console.log(`    Updating Item ${itemId} -> ${newSku}`);
                await db.run(sql`UPDATE items SET sku = ${newSku} WHERE id = ${itemId}`);
            }
        }
    }
}

main().then(() => {
    console.log('✅ Done');
    process.exit(0);
});
