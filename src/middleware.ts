import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware(routing);

// Protected routes — require authentication
const protectedPaths = [
  '/dashboard',
  '/tests',
  '/results',
  '/rating',
  '/profile',
  '/pricing',
  '/teacher',
  '/admin',
];

// Role-based paths
const teacherPaths = ['/teacher'];
const adminPaths = ['/admin'];

// Public paths (no auth needed)
const publicPaths = ['/', '/login', '/auth', '/share'];

function getCleanPath(pathname: string): string {
  return pathname.replace(/^\/(uz|ru|en)/, '') || '/';
}

function isProtectedPath(pathname: string): boolean {
  const cleanPath = getCleanPath(pathname);
  return protectedPaths.some(path => cleanPath.startsWith(path));
}

function isTeacherPath(pathname: string): boolean {
  const cleanPath = getCleanPath(pathname);
  return teacherPaths.some(path => cleanPath.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  const cleanPath = getCleanPath(pathname);
  return adminPaths.some(path => cleanPath.startsWith(path));
}

/**
 * Decode JWT token to extract user role.
 * Uses jose library for Edge Runtime compatibility.
 */
async function getTokenPayload(request: NextRequest): Promise<{ role?: string; id?: string } | null> {
  const sessionCookie = request.cookies.get('__Secure-authjs.session-token') ||
    request.cookies.get('authjs.session-token');

  if (!sessionCookie?.value) return null;

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const encodedSecret = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(sessionCookie.value, encodedSecret, {
      algorithms: ['HS256'],
    });

    return {
      role: payload.role as string | undefined,
      id: payload.id as string | undefined,
    };
  } catch {
    // Token is invalid or expired
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // For public paths, just apply i18n
  const cleanPath = getCleanPath(pathname);
  if (!isProtectedPath(pathname)) {
    // If authenticated user goes to /login, redirect to dashboard
    const sessionCookie = request.cookies.get('__Secure-authjs.session-token') ||
      request.cookies.get('authjs.session-token');
    if (sessionCookie?.value && cleanPath.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return intlMiddleware(request);
  }

  // === PROTECTED ROUTES ===

  // Verify JWT token
  const tokenPayload = await getTokenPayload(request);

  if (!tokenPayload) {
    // Not authenticated or invalid token — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = tokenPayload.role || 'USER';

  // === ROLE-BASED ACCESS CONTROL ===

  // Admin paths — only ADMIN role
  if (isAdminPath(pathname) && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Teacher paths — only TEACHER or ADMIN roles
  if (isTeacherPath(pathname) && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Apply i18n middleware for valid requests
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
};
