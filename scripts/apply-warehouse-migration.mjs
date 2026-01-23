#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

// Direct database connection without Drizzle
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  try {
    const dbPath = 'file:' + path.join(__dirname, '..', 'db', 'data.db');
    console.log(`📦 Applying migration to database: ${dbPath}`);

    const client = createClient({ url: dbPath });

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '20250112_add_warehouse_locations.sql');
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
    // Use executeBatch for multiple statements
    const result = await client.batch(batch, 'write');

    console.log(`✅ Migration applied successfully! (${result.length} statements executed)\n`);

    // Verify tables were created
    const tablesResult = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%warehouse%' OR name = 'inventory_location_transfers')
      ORDER BY name
    `);

    console.log(`📋 Tables created/updated (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach((row) => console.log(`   - ${row.name}`));

    // Show summary
    console.log('\n📊 Migration Summary:');
    try {
      const warehouses = await client.execute(`SELECT COUNT(*) as count FROM warehouses`);
      console.log(`   - Warehouses: ${warehouses.rows[0].count}`);

      const locations = await client.execute(`SELECT COUNT(*) as count FROM warehouse_locations`);
      console.log(`   - Locations: ${locations.rows[0].count}`);
    } catch (e) {
      // Might fail if tables don't exist yet
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

applyMigration();
