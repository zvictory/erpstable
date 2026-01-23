import { db } from '../../db';
import { users } from '../../db/schema/auth';
import { hashPassword } from '../lib/auth-utils';
import { eq } from 'drizzle-orm';

async function seedAdminUser() {
    console.log('🌱 Seeding admin user...');

    const adminEmail = 'admin@laza.uz';

    // Check if admin already exists
    const existingAdminResult = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    const existingAdmin = existingAdminResult[0];

    if (existingAdmin) {
        console.log('✅ Admin user already exists');
        return;
    }

    // Create admin user
    const hashedPassword = await hashPassword('Admin123!'); // Change in production

    await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
        isActive: true,
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@laza.uz');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
}

seedAdminUser()
    .then(() => {
        console.log('✅ Seeding complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    });
