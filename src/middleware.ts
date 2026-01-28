import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import createMiddleware from 'next-intl/middleware';

export const runtime = 'nodejs';

const intlMiddleware = createMiddleware({
    locales: ['ru', 'en', 'uz', 'tr'],
    defaultLocale: 'ru',
    localePrefix: 'always', // or 'as-needed'
    localeDetection: false
});

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    // Skip intl middleware for auth API routes
    if (nextUrl.pathname.includes('/api/auth/')) {
        return undefined;
    }

    // Allow all requests in test mode (Playwright testing)
    if (process.env.PLAYWRIGHT_TEST === 'true') {
        return intlMiddleware(req);
    }

    // Extract locale and path
    const pathnameWithoutLocale = nextUrl.pathname.replace(/^\/(ru|en|uz|tr)/, '');
    const isLoginPage = pathnameWithoutLocale === '/login';
    const locale = nextUrl.pathname.split('/')[1] || 'ru';

    // Redirect logged-in users away from login page
    if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL(`/${locale}/`, nextUrl));
    }

    // Redirect non-logged-in users to login (except for login page)
    if (!isLoggedIn && !isLoginPage) {
        const loginUrl = new URL(`/${locale}/login`, nextUrl);
        return Response.redirect(loginUrl);
    }

    // Run intl middleware for all other cases
    return intlMiddleware(req);
});

export const config = {
    // Matcher excluding api, static, etc., but allow /api/auth routes through
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
