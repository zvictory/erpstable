import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = `file:${path.join(__dirname, '../db/data.db')}`;

console.log('🔧 Setting up test database...');
console.log(`📁 Database: ${dbUrl}`);

const client = createClient({ url: dbUrl });

async function setupDatabase() {
  try {
    // Check if business_settings table exists
    let tableExists = false;
    try {
      const result = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='business_settings'`
      );
      tableExists = result.rows.length > 0;
    } catch (e) {
      // Table doesn't exist
      tableExists = false;
    }

    if (!tableExists) {
      console.log('⚠️  business_settings table not found. Creating...');
      await client.execute(`
        CREATE TABLE business_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_type TEXT NOT NULL,
          setup_completed INTEGER NOT NULL DEFAULT 0,
          enabled_modules TEXT NOT NULL DEFAULT '[]',
          customizations TEXT DEFAULT '{}',
          created_at INTEGER NOT NULL DEFAULT (CAST(UNIXEPOCH() AS INTEGER)),
          updated_at INTEGER NOT NULL DEFAULT (CAST(UNIXEPOCH() AS INTEGER))
        )
      `);
      console.log('✅ Created business_settings table');
    }

    // Clear existing records
    await client.execute('DELETE FROM business_settings');
    console.log('🗑️  Cleared existing business settings');

    // Insert manufacturing business type with all modules
    const manufacturingModules = [
      'MANUFACTURING',
      'INVENTORY',
      'PURCHASING',
      'SALES',
      'FINANCE',
      'ASSETS',
      'PRODUCTION'
    ];

    const now = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: `
        INSERT INTO business_settings (
          business_type,
          setup_completed,
          enabled_modules,
          customizations,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        'MANUFACTURING',
        1,
        JSON.stringify(manufacturingModules),
        JSON.stringify({
          workCenters: true,
          billsOfMaterial: true,
          productionScheduling: true,
          qualityControl: true
        }),
        now,
        now
      ]
    });

    console.log('✨ Initialized business_settings with:');
    console.log(`  - Business Type: MANUFACTURING`);
    console.log(`  - Setup Completed: YES`);
    console.log(`  - Enabled Modules: ${manufacturingModules.join(', ')}`);

    // Verify
    const result = await client.execute('SELECT * FROM business_settings WHERE id = 1');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('\n📋 Verification:');
      console.log(`  - Record ID: ${row.id}`);
      console.log(`  - Business Type: ${row.business_type}`);
      console.log(`  - Setup Completed: ${row.setup_completed ? 'Yes' : 'No'}`);
      console.log(`  - Enabled Modules: ${JSON.parse(row.enabled_modules).join(', ')}`);
    }

    console.log('\n✅ Test database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up test database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();
