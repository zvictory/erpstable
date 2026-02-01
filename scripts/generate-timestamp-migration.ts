import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('./db/data.db');

console.log('🔍 Scanning for tables with timestamp columns...\n');

// Get all tables with timestamp columns
const tables = db.prepare(`
  SELECT DISTINCT m.name as table_name
  FROM sqlite_master m
  JOIN pragma_table_info(m.name) p
  WHERE m.type = 'table'
  AND (p.name = 'created_at' OR p.name = 'updated_at')
  ORDER BY m.name
`).all() as Array<{ table_name: string }>;

console.log(`✓ Found ${tables.length} tables with timestamp columns\n`);

// Check which have TEXT timestamps
let textTimestampCount = 0;
const affectedTables = [];

for (const { table_name } of tables) {
  const columns = db.prepare(`
    SELECT name, type
    FROM pragma_table_info(?)
    WHERE name IN ('created_at', 'updated_at')
  `).all(table_name) as Array<{ name: string; type: string }>;

  for (const { name } of columns) {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM ${table_name}
      WHERE typeof(${name}) = 'text'
    `).get() as { count: number };

    if (result.count > 0) {
      textTimestampCount += result.count;
      affectedTables.push(table_name);
    }
  }
}

affectedTables.sort();
const uniqueAffected = [...new Set(affectedTables)];

console.log(`📊 Found ${textTimestampCount} TEXT timestamp values across ${uniqueAffected.length} tables`);
console.log(`📝 Affected tables: ${uniqueAffected.join(', ')}\n`);

// Generate migration SQL
let sql = `-- Migration: Fix TEXT timestamps to INTEGER timestamps
-- Generated: ${new Date().toISOString()}
-- Affected rows: ${textTimestampCount}
-- Affected tables: ${uniqueAffected.length}
--
-- Issue: SQLite CURRENT_TIMESTAMP returns TEXT format: "2026-01-29 17:21:58"
-- Schema expects: INTEGER Unix epoch format: 1738170118
-- Solution: Convert TEXT timestamps to Unix epoch using strftime('%s', column_name)

BEGIN TRANSACTION;

`;

for (const { table_name } of tables) {
  // Check which timestamp columns exist
  const columns = db.prepare(`
    SELECT name, type
    FROM pragma_table_info(?)
    WHERE name IN ('created_at', 'updated_at')
  `).all(table_name) as Array<{ name: string; type: string }>;

  for (const { name } of columns) {
    sql += `-- Convert ${table_name}.${name} from TEXT to INTEGER\n`;
    sql += `UPDATE ${table_name}\n`;
    sql += `SET ${name} = CAST(strftime('%s', ${name}) AS INTEGER)\n`;
    sql += `WHERE typeof(${name}) = 'text';\n\n`;
  }
}

sql += `COMMIT;

-- Verification Queries (run these to verify migration success)
-- SELECT 'Migration complete!' as status;
-- SELECT table_name, COUNT(*) as remaining_text_timestamps
-- FROM (
--   SELECT 'items' as table_name FROM items WHERE typeof(created_at) = 'text'
--   UNION ALL
--   SELECT 'inspection_orders' as table_name FROM inspection_orders WHERE typeof(created_at) = 'text'
--   -- ... and so on for all affected tables
-- )
-- GROUP BY table_name;
`;

// Write to migrations directory
const migrationPath = path.join(
  process.cwd(),
  'db/migrations/20260201_fix_timestamp_columns.sql'
);

fs.writeFileSync(migrationPath, sql);

console.log(`✅ Migration SQL generated: ${migrationPath}`);
console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)}KB`);
console.log(`\n⚡ Next steps:`);
console.log(`   1. Backup: cp db/data.db db/data.db.backup-timestamp-fix-\$(date +%Y%m%d-%H%M%S)`);
console.log(`   2. Run: sqlite3 db/data.db < db/migrations/20260201_fix_timestamp_columns.sql`);
console.log(`   3. Verify: npx tsx scripts/verify-timestamp-migration.ts`);

db.close();
