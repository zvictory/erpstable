import { db } from '../../db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function apply() {
    console.log('🚀 Applying migration...');
    const migrationPath = path.join(process.cwd(), 'drizzle/0002_fearless_titanium_man.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split statements (simple split by semicolon might fail on triggers/strings, but usually fine for simple migrations)
    // Actually, let's just run the whole thing if the driver supports it, or split.
    // Drizzle migration usually contains multiple statements.

    // Better: use split by `--> statement-breakpoint` which Drizzle often uses.
    const statements = migrationSql.split('--> statement-breakpoint');

    try {
        await db.run(sql`PRAGMA foreign_keys = OFF`);

        await db.run(sql`BEGIN TRANSACTION`);

        for (const stmt of statements) {
            const trimmed = stmt.trim();
            if (trimmed) {
                // console.log('Executing:', trimmed.substring(0, 50) + '...');
                await db.run(sql.raw(trimmed));
            }
        }

        await db.run(sql`COMMIT`);
        console.log('✅ Migration applied.');

    } catch (e) {
        console.error('❌ Migration failed:', e);
        await db.run(sql`ROLLBACK`);
    } finally {
        await db.run(sql`PRAGMA foreign_keys = ON`);
    }
}

apply().then(() => {
    process.exit(0);
});
