
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Ensure env var is set
const url = process.env.DATABASE_URL || 'file:db/data.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Use global object for caching to avoid re-initialization
declare global {
  var dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

if (!globalThis.dbInstance) {
  const client = createClient({ url, authToken });
  globalThis.dbInstance = drizzle(client, { schema });
  console.log('Database initialized with URL:', url);
}

export const db = globalThis.dbInstance!;
