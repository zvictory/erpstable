import * as schema from './schema';

// Ensure env var is set
const url = process.env.DATABASE_URL || 'file:db/data.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Use global object for caching to avoid re-initialization
declare global {
  var dbInstance: any;
}

if (!globalThis.dbInstance) {
  // Use better-sqlite3 for local file: URLs, libsql for remote URLs
  if (url.startsWith('file:')) {
    // Local SQLite database using better-sqlite3
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const Database = require('better-sqlite3');

    const dbPath = url.replace('file:', '');
    const sqlite = new Database(dbPath);
    globalThis.dbInstance = drizzle(sqlite, { schema });
    console.log('Database initialized with better-sqlite3 at:', dbPath);
  } else {
    // Remote database using libsql (Turso)
    const { drizzle } = require('drizzle-orm/libsql');
    const { createClient } = require('@libsql/client');

    const client = createClient({ url, authToken });
    globalThis.dbInstance = drizzle(client, { schema });
    console.log('Database initialized with libsql at:', url);
  }
}

export const db = globalThis.dbInstance!;
