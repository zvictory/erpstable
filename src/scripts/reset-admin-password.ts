import { db } from '../../db';
import { users } from '../../db/schema/auth';
import { hashPassword } from '../lib/auth-utils';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
    console.log('🔄 Resetting admin password...');

    const adminEmail = 'admin@laza.uz';
    const newPassword = 'Admin123!';
    const hashedPassword = await hashPassword(newPassword);

    try {
        const result = await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.email, adminEmail))
            .returning();

        if (result.length > 0) {
            console.log('✅ Password updated successfully for:', adminEmail);
            console.log('New Password:', newPassword);
        } else {
            console.log('❌ User not found:', adminEmail);
            // Optionally create it if missing, but for now we expect it to exist
        }
    } catch (error) {
        console.error('❌ Failed to update password:', error);
    }
}

resetAdminPassword()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
