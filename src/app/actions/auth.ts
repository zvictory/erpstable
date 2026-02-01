'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { users } from '../../../db/schema/auth';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth-utils';

export async function changePassword(data: {
    currentPassword: string;
    newPassword: string;
}) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return { success: false, error: 'Not authenticated' };
        }

        // Get user from database
        const userResult = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);
        const user = userResult[0];

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Verify current password
        const isValidPassword = await verifyPassword(data.currentPassword, user.password);
        if (!isValidPassword) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Validate new password strength
        const validation = validatePasswordStrength(data.newPassword);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        // Hash new password
        const hashedPassword = await hashPassword(data.newPassword);

        // Update password
        await db.update(users)
            .set({
                password: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        return { success: true };
    } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error: 'Failed to change password' };
    }
}

export async function getUsers() {
    try {
        const results = await db.select({
            id: users.id,
            name: users.name,
            email: users.email
        }).from(users);
        return results;
    } catch (error) {
        console.error('Get users error:', error);
        return [];
    }
}
