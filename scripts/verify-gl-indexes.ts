import { db } from '../db';
import { sql } from 'drizzle-orm';

async function verifyIndexes() {
    console.log('🔍 Verifying General Ledger indexes...\n');

    try {
        const allIndexes = await db.all(sql`
            SELECT
                name,
                tbl_name as tableName,
                sql
            FROM sqlite_master
            WHERE type='index'
            AND (
                name LIKE 'idx_je_%' OR
                name = 'je_date_idx'
            )
            ORDER BY tbl_name, name
        `);

        console.log('Found indexes:\n');
        allIndexes.forEach((idx: any) => {
            console.log(`✅ ${idx.name}`);
            console.log(`   Table: ${idx.tableName}`);
            console.log(`   SQL: ${idx.sql || 'N/A'}\n`);
        });

        console.log(`Total: ${allIndexes.length} indexes\n`);
    } catch (error) {
        console.error('❌ Error verifying indexes:', error);
        process.exit(1);
    }
}

verifyIndexes();
