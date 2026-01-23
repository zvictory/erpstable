import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  console.log('\n🔧 Global test setup starting...');

  try {
    // Run database setup
    console.log('📦 Setting up test database...');
    execSync('node scripts/setup-test-db.mjs', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log('✅ Global test setup complete!\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
