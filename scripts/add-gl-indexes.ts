import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addIndexes() {
    console.log('📊 Adding General Ledger indexes...');

    try {
        // Check existing indexes
        const existingIndexes = await db.all(sql`
            SELECT name FROM sqlite_master 
            WHERE type='index' AND name IN ('idx_je_transaction_id', 'idx_je_reference', 'idx_je_lines_account')
        `);

        const existingIndexNames = existingIndexes.map((row: any) => row.name);

        // Add idx_je_transaction_id if it doesn't exist
        if (!existingIndexNames.includes('idx_je_transaction_id')) {
            console.log('Creating index: idx_je_transaction_id');
            await db.run(sql`CREATE INDEX IF NOT EXISTS idx_je_transaction_id ON journal_entries(transaction_id)`);
            console.log('✅ Index idx_je_transaction_id created');
        } else {
            console.log('⏭️  Index idx_je_transaction_id already exists');
        }

        // Add idx_je_reference if it doesn't exist
        if (!existingIndexNames.includes('idx_je_reference')) {
            console.log('Creating index: idx_je_reference');
            await db.run(sql`CREATE INDEX IF NOT EXISTS idx_je_reference ON journal_entries(reference)`);
            console.log('✅ Index idx_je_reference created');
        } else {
            console.log('⏭️  Index idx_je_reference already exists');
        }

        // Add idx_je_lines_account if it doesn't exist
        if (!existingIndexNames.includes('idx_je_lines_account')) {
            console.log('Creating index: idx_je_lines_account');
            await db.run(sql`CREATE INDEX IF NOT EXISTS idx_je_lines_account ON journal_entry_lines(account_code)`);
            console.log('✅ Index idx_je_lines_account created');
        } else {
            console.log('⏭️  Index idx_je_lines_account already exists');
        }

        console.log('✅ All General Ledger indexes are in place');
    } catch (error) {
        console.error('❌ Error adding indexes:', error);
        process.exit(1);
    }
}

addIndexes();
