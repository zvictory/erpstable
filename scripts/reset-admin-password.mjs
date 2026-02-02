import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Database from 'better-sqlite3';

// Generate strong password
const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
const newPassword = `Laza${randomPart}2026!`;

console.log('\n✅ Admin Password Reset\n');
console.log('========================================');
console.log('Email:    admin@erpstable.com');
console.log('Password: ' + newPassword);
console.log('========================================\n');

try {
  // Hash the password with bcryptjs
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  // Update database
  const db = new Database('db/data.db');

  const stmt = db.prepare(`
    UPDATE users
    SET password = ?, updated_at = ?
    WHERE email = 'admin@erpstable.com'
  `);

  const now = Math.floor(Date.now() / 1000);
  const result = stmt.run(hash, now);

  if (result.changes > 0) {
    console.log('✅ Password updated successfully!');
    console.log('\n🌐 Login: https://laza.erpstable.com');
    console.log('📧 Email: admin@erpstable.com');
    console.log('🔑 Password: ' + newPassword);
  } else {
    console.log('❌ User not found');
  }

  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
