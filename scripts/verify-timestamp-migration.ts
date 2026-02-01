import Database from 'better-sqlite3';

const db = new Database('./db/data.db');

console.log('🔍 Verifying timestamp migration...\n');

// Get all tables with timestamp columns
const tables = db.prepare(`
  SELECT DISTINCT m.name as table_name
  FROM sqlite_master m
  JOIN pragma_table_info(m.name) p
  WHERE m.type = 'table'
  AND (p.name = 'created_at' OR p.name = 'updated_at')
  ORDER BY m.name
`).all() as Array<{ table_name: string }>;

let hasTextTimestamps = false;
let totalIntegerCount = 0;
let totalNullCount = 0;
let totalTextCount = 0;

console.log('📋 Table-by-table verification:\n');

for (const { table_name } of tables) {
  const columns = db.prepare(`
    SELECT name, type
    FROM pragma_table_info(?)
    WHERE name IN ('created_at', 'updated_at')
  `).all(table_name) as Array<{ name: string; type: string }>;

  for (const { name } of columns) {
    const result = db.prepare(`
      SELECT
        SUM(CASE WHEN typeof(${name}) = 'integer' THEN 1 ELSE 0 END) as integer_count,
        SUM(CASE WHEN typeof(${name}) = 'null' THEN 1 ELSE 0 END) as null_count,
        SUM(CASE WHEN typeof(${name}) = 'text' THEN 1 ELSE 0 END) as text_count
      FROM ${table_name}
    `).get() as { integer_count: number; null_count: number; text_count: number };

    const { integer_count, null_count, text_count } = result;

    if (text_count > 0) {
      console.log(`✗ ${table_name}.${name}: ${text_count} TEXT timestamps remain`);
      hasTextTimestamps = true;
    } else {
      console.log(`✓ ${table_name}.${name}: ${integer_count} INTEGER, ${null_count} NULL`);
      totalIntegerCount += integer_count || 0;
      totalNullCount += null_count || 0;
    }
    totalTextCount += text_count || 0;
  }
}

console.log('\n📊 Summary:\n');
console.log(`  Total INTEGER timestamps: ${totalIntegerCount}`);
console.log(`  Total NULL timestamps: ${totalNullCount}`);
console.log(`  Total TEXT timestamps: ${totalTextCount}`);

if (hasTextTimestamps) {
  console.error('\n❌ Migration INCOMPLETE - TEXT timestamps still exist');
  process.exit(1);
} else {
  console.log('\n✅ Migration SUCCESSFUL - all timestamps are INTEGER or NULL');
  process.exit(0);
}

db.close();
