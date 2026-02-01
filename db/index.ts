import * as schema from './schema';

// Ensure env var is set
const url = process.env.DATABASE_URL || 'file:db/data.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Use global object for caching to avoid re-initialization
declare global {
  var dbInstance: any;
}

// Use libsql for both local and remote to support async transactions everywhere
const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');

if (!globalThis.dbInstance) {
  const client = createClient({ url, authToken });

  // ✅ Enable foreign key constraints
  if (url.startsWith('file:')) {
    // Local SQLite requires a direct command
    client.execute('PRAGMA foreign_keys = ON;').catch((e: any) => {
      console.warn('Failed to enable foreign keys on local SQLite:', e);
    });
    console.log('Database initialized with libsql (local) at:', url);
  } else {
    // Remote database
    client.execute('PRAGMA foreign_keys = ON;').catch(() => {
      // Remote databases may not support PRAGMA, continue silently
    });
    console.log('Database initialized with libsql (remote) at:', url);
  }

  globalThis.dbInstance = drizzle(client, { schema });
}

export const db = globalThis.dbInstance!;
