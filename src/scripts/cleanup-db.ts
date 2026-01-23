import { db } from '../../db';
import { sql } from 'drizzle-orm';

async function cleanup() {
    console.log('🧹 Cleaning up database...');
    try {
        await db.run(sql`DROP TABLE IF EXISTS "__old_push_items"`);
        console.log('Dropped __old_push_items');
    } catch (e) {
        console.error('Error dropping table:', e);
    }
}

cleanup().then(() => {
    console.log('✅ Cleanup done');
    process.exit(0);
});
