
import { Database } from "bun:sqlite";
import fs from 'fs';
import path from 'path';

// Note: The environment uses 'better-sqlite3' usually for node, or we can use the existing db connection.
// Let's use the project's db method or just raw better-sqlite3 since it is installed.

import DatabaseConstructor from 'better-sqlite3';

const dbPath = path.resolve(process.cwd(), 'db/data.db');
console.log(`Opening database at ${dbPath}`);

const db = new DatabaseConstructor(dbPath);

try {
    console.log('Checking if order_index column exists in deals table...');
    const tableInfo = db.prepare("PRAGMA table_info(deals)").all();
    const hasColumn = tableInfo.some((col: any) => col.name === 'order_index');

    if (hasColumn) {
        console.log('Column order_index already exists.');
    } else {
        console.log('Adding order_index column...');
        db.prepare("ALTER TABLE deals ADD COLUMN order_index INTEGER DEFAULT 0 NOT NULL").run();
        console.log('Successfully added order_index column.');
    }
} catch (error) {
    console.error('Error modifying database:', error);
} finally {
    db.close();
}
