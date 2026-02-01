/**
 * Test Environment Setup
 *
 * This file configures the test environment to use an isolated database
 * instead of the production database (db/data.db).
 *
 * This prevents test data from accumulating in the production database.
 */

import { existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

// Use a separate test database file
// This is a copy of the production database to ensure schema compatibility
const testDbPath = 'file:db/data.test.db';
const prodDbPath = 'db/data.db';
const testDbFile = resolve(process.cwd(), 'db/data.test.db');

// Before tests run, create a fresh copy of the production database
// This ensures tests have the correct schema but won't pollute production data
if (existsSync(prodDbPath)) {
  copyFileSync(prodDbPath, testDbFile);
  console.log('✓ Test environment configured: Created isolated test database from production schema');
} else {
  console.warn('⚠ Production database not found. Tests will use existing test database or create new one.');
}

process.env.DATABASE_URL = testDbPath;

// Clean up test data after all tests complete
process.on('beforeExit', () => {
  // Optional: Delete test database after tests
  // Uncomment if you want to remove test.db after each run
  // if (existsSync(testDbFile)) {
  //   unlinkSync(testDbFile);
  //   console.log('✓ Test database cleaned up');
  // }
});
