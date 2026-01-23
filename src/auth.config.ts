
import type { NextAuthConfig } from 'next-auth';

// 1. Define Roles Enum
export enum UserRole {
    FACTORY_WORKER = 'FACTORY_WORKER',
    PLANT_MANAGER = 'PLANT_MANAGER',
    ACCOUNTANT = 'ACCOUNTANT',
    ADMIN = 'ADMIN',
}

// 2. Define Routes Access Rules (Consumed by Middleware)
export const ROUTE_ACCESS_RULES = {
    '/factory': [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
    '/dashboard': [UserRole.PLANT_MANAGER, UserRole.ACCOUNTANT, UserRole.ADMIN],
    '/finance': [UserRole.ACCOUNTANT, UserRole.ADMIN],
};

export const authConfig = {
    trustHost: true, // Allow all hosts in production (required for deployment)
    pages: {
        signIn: '/login',
    },
    providers: [
        // In a real app, define Credentials or OAuth providers here.
        // For this configuration file (edge compatible), we mostly focus on callbacks.
    ],
    callbacks: {
        // 3. Propagate Role to Session/JWT
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const userRole = (auth?.user as any)?.role as UserRole | undefined;

            // Check specific path protection
            const path = nextUrl.pathname;

            if (path.startsWith('/factory')) {
                if (!isLoggedIn) return false;
                if (ROUTE_ACCESS_RULES['/factory'].includes(userRole!)) return true;
                return Response.redirect(new URL('/unauthorized', nextUrl));
            }

            if (path.startsWith('/dashboard')) {
                if (!isLoggedIn) return false;
                if (ROUTE_ACCESS_RULES['/dashboard'].includes(userRole!)) return true;
                return Response.redirect(new URL('/factory', nextUrl)); // Fallback redirect?
            }

            if (path.startsWith('/finance')) {
                // if (!isLoggedIn) return false;
                // if (ROUTE_ACCESS_RULES['/finance'].includes(userRole!)) return true;
                // // If Worker tries to access finance -> Redirect to factory (Requirement)
                // return Response.redirect(new URL('/factory', nextUrl));
                return true;
            }

            return true;
        },
        // Adding role to token/session
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
            }
            return session;
        },
        // Handle redirect URL properly for production
        async redirect({ url, baseUrl }) {
            // Prevent open redirect vulnerabilities - only allow same origin redirects
            if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
            }
            // Allow redirects to our own domain
            if (new URL(url).origin === new URL(baseUrl).origin) {
                return url;
            }
            return baseUrl;
        }
    },
} satisfies NextAuthConfig;
