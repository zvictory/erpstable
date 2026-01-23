#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');

async function applyMigration() {
  try {
    const dbPath = path.join(__dirname, '..', 'db', 'data.db');
    console.log(`📦 Applying migration to database: ${dbPath}`);

    const db = sqlite3(dbPath);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '20250112_add_warehouse_locations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Apply migration in transaction
    db.exec('BEGIN TRANSACTION');

    let count = 0;
    for (const stmt of statements) {
      try {
        db.exec(stmt);
        count++;
      } catch (err) {
        console.error(`❌ Error executing statement: ${stmt.substring(0, 50)}...`);
        db.exec('ROLLBACK');
        throw err;
      }
    }

    db.exec('COMMIT');

    console.log(`✅ Migration applied successfully! (${count} statements executed)`);

    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%warehouse%' OR name = 'inventory_location_transfers')
    `).all();

    console.log(`📋 Created/updated ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.name}`));

    db.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
