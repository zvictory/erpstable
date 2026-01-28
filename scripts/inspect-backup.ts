
import Database from 'better-sqlite3';

const BACKUP_PATH = 'db/data.db.backup-before-cleanup-20260121-171424';

console.log(`Inspecting backup: ${BACKUP_PATH}`);

try {
    const db = new Database(BACKUP_PATH, { readonly: true });

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables found:', tables.map(t => t.name).join(', '));

    // Check specific tables for data
    const targetTables = ['vendor_bills', 'purchase_orders', 'items'];

    for (const table of targetTables) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            console.log(`Table '${table}' has ${count.count} rows.`);

            if (count.count > 0 && table === 'vendor_bills') {
                const rows = db.prepare(`SELECT * FROM ${table} LIMIT 5`).all();
                console.log('Sample Bills:', rows);
            }
        } catch (e) {
            console.log(`Table '${table}' not found or error: ${e.message}`);
        }
    }

    db.close();

} catch (error) {
    console.error('Error opening backup:', error);
}
