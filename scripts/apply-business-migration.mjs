#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Direct database connection without Drizzle
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  try {
    const dbPath = 'file:' + path.join(__dirname, '..', 'db', 'data.db');
    console.log(`📦 Applying business settings migration to: ${dbPath}`);

    const client = createClient({ url: dbPath });

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '20260115_add_business_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split statements on semicolon
    const statements = migrationSQL
      .split(';')
      .map(stmt => {
        // Remove comment lines
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} statements to execute\n`);

    // Execute each statement individually using batch
    const batch = [];
    for (const stmt of statements) {
      batch.push(stmt);
    }

    console.log(`⏳ Executing migration batch...`);
    const result = await client.batch(batch, 'write');

    console.log(`✅ Migration applied successfully! (${result.length} statements executed)\n`);

    // Verify table was created
    const tablesResult = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='business_settings'
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`📋 Table created: business_settings`);
    }

    console.log('\n✨ Business settings migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

applyMigration();
