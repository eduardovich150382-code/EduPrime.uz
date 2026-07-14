import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

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
const publicPaths = ['/', '/login', '/auth'];

function isProtectedPath(pathname: string): boolean {
  // Remove locale prefix if exists
  const cleanPath = pathname.replace(/^\/(uz|ru|en)/, '') || '/';
  return protectedPaths.some(path => cleanPath.startsWith(path));
}

function isPublicPath(pathname: string): boolean {
  const cleanPath = pathname.replace(/^\/(uz|ru|en)/, '') || '/';
  return publicPaths.some(path => cleanPath === path || cleanPath.startsWith(path));
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check if user is authenticated via cookie
  const sessionCookie = request.cookies.get('__Secure-authjs.session-token') || 
                        request.cookies.get('authjs.session-token');

  const isAuthenticated = !!sessionCookie?.value;

  // Check if it's a protected path
  if (isProtectedPath(pathname) && !isAuthenticated) {
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user goes to /login, redirect to dashboard
  if (isAuthenticated && pathname.replace(/^\/(uz|ru|en)/, '').startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Apply i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
};
