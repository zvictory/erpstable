import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, '../db/data.db');

const db = new Database(dbPath);

console.log('Converting timestamps from seconds to milliseconds...\n');

// Get all tables with timestamp columns
const tables = db.prepare(`
  SELECT DISTINCT m.name as table_name
  FROM sqlite_master m
  JOIN pragma_table_info(m.name) p
  WHERE m.type = 'table'
  AND p.name IN ('created_at', 'updated_at', 'inspected_at')
  ORDER BY m.name
`).all() as Array<{ table_name: string }>;

console.log(`Found ${tables.length} tables with timestamp columns\n`);

db.exec('BEGIN TRANSACTION;');

try {
  for (const { table_name } of tables) {
    // Get timestamp columns for this table
    const columns = db.prepare(`
      SELECT name
      FROM pragma_table_info(?)
      WHERE name IN ('created_at', 'updated_at', 'inspected_at')
    `).all(table_name) as Array<{ name: string }>;

    for (const { name } of columns) {
      console.log(`Converting ${table_name}.${name}...`);

      // Count before
      const countBefore = db.prepare(`
        SELECT COUNT(*) as count FROM ${table_name}
        WHERE ${name} IS NOT NULL
        AND ${name} < 10000000000
      `).get() as { count: number };

      if (countBefore.count > 0) {
        // Multiply by 1000 to convert seconds to milliseconds
        // Only update rows where value is less than a reasonable millisecond threshold
        // (to avoid converting already-converted values)
        db.prepare(`
          UPDATE ${table_name}
          SET ${name} = ${name} * 1000
          WHERE ${name} IS NOT NULL
          AND ${name} < 10000000000
        `).run();

        console.log(`  ✓ Updated ${countBefore.count} rows`);
      } else {
        console.log(`  ✓ No rows to update`);
      }
    }
  }

  db.exec('COMMIT;');
  console.log('\n✓ Migration complete!');

} catch (error) {
  db.exec('ROLLBACK;');
  console.error('\n✗ Migration failed:', error);
  throw error;
} finally {
  db.close();
}
