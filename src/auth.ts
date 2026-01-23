import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { db } from '../db';
import { users } from '../db/schema/auth';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './lib/auth-utils';
import { UserRole } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                // Find user by email
                const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
                const user = userResult[0];

                if (!user) {
                    return null;
                }

                // Check if user is active
                if (!user.isActive) {
                    throw new Error('Account is deactivated');
                }

                // Verify password
                const isValidPassword = await verifyPassword(password, user.password);

                if (!isValidPassword) {
                    return null;
                }

                // Update last login
                await db.update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.id, user.id));

                // Return user object (without password)
                return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role as UserRole,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
});
