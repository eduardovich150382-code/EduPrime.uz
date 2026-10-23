import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getCleanPath, isProtectedPath } from './lib/protected-paths';

const intlMiddleware = createMiddleware(routing);

/**
 * Check if user has a session cookie.
 * Note: Full JWT verification and role-based access is handled
 * in layout.tsx files (server-side) using auth() from NextAuth.
 * This middleware only checks cookie presence for redirect logic.
 */
function isAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('__Secure-authjs.session-token') ||
    request.cookies.get('authjs.session-token');
  return !!sessionCookie?.value;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const cleanPath = getCleanPath(pathname);
  const authenticated = isAuthenticated(request);

  // If authenticated user goes to /login, redirect to dashboard
  if (authenticated && cleanPath.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If NOT authenticated and trying to access protected path, redirect to login
  if (!authenticated && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Apply i18n middleware for all other requests
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
};
