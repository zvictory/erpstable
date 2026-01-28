import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrateAuditLogs() {
    try {
        console.log('🔄 Migrating audit_logs table...');

        // Add new columns to existing audit_logs table
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN entity TEXT NOT NULL DEFAULT ''`);
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN entity_id TEXT NOT NULL DEFAULT ''`);
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN user_name TEXT`);
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN user_role TEXT`);
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN ip_address TEXT`);
        await db.run(sql`ALTER TABLE audit_logs ADD COLUMN user_agent TEXT`);

        // Create indexes
        await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity, entity_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_date_idx ON audit_logs(created_at)`);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateAuditLogs();
