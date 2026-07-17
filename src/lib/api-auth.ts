import { NextResponse } from 'next/server';
import { auth } from './auth';
import type { UserRole } from '@/types';

/**
 * API Auth utilities for protecting API routes.
 * 
 * Usage:
 *   const { session, user, error } = await requireAuth();
 *   if (error) return error;
 *   // user is guaranteed to exist here
 * 
 *   const { session, user, error } = await requireRole('ADMIN');
 *   if (error) return error;
 *   // user is guaranteed to be ADMIN
 */

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  lang: string;
  telegramId?: string | null;
}

interface AuthResult {
  session: any;
  user: AuthUser;
  error: null;
}

interface AuthError {
  session: null;
  user: null;
  error: NextResponse;
}

type AuthResponse = AuthResult | AuthError;

/**
 * Require authentication for an API route.
 * Returns the session and user, or an error response.
 */
export async function requireAuth(): Promise<AuthResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        session: null,
        user: null,
        error: NextResponse.json(
          { error: 'Avtorizatsiya talab qilinadi', code: 'UNAUTHORIZED' },
          { status: 401 }
        ),
      };
    }

    const user: AuthUser = {
      id: (session.user as any).id || session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: ((session.user as any).role || 'USER') as UserRole,
      lang: (session.user as any).lang || 'uz',
      telegramId: (session.user as any).telegramId || null,
    };

    // Ensure user has an ID
    if (!user.id) {
      return {
        session: null,
        user: null,
        error: NextResponse.json(
          { error: 'Foydalanuvchi topilmadi', code: 'USER_NOT_FOUND' },
          { status: 401 }
        ),
      };
    }

    return { session, user, error: null };
  } catch {
    return {
      session: null,
      user: null,
      error: NextResponse.json(
        { error: 'Avtorizatsiya xatosi', code: 'AUTH_ERROR' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require a specific role for an API route.
 * Accepts one or more roles.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthResponse> {
  const result = await requireAuth();

  if (result.error) return result;

  if (!roles.includes(result.user.role)) {
    return {
      session: null,
      user: null,
      error: NextResponse.json(
        { error: 'Ruxsat berilmagan', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Require ADMIN role for an API route.
 */
export async function requireAdmin(): Promise<AuthResponse> {
  return requireRole('ADMIN');
}

/**
 * Require TEACHER or ADMIN role for an API route.
 */
export async function requireTeacher(): Promise<AuthResponse> {
  return requireRole('TEACHER', 'ADMIN');
}

/**
 * Rate limiting utility (simple in-memory, per-user).
 * For production, use Redis or similar.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = userId;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Apply rate limiting to a request.
 * Returns an error response if rate limited, null otherwise.
 */
export function applyRateLimit(
  userId: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): NextResponse | null {
  const { allowed, remaining } = checkRateLimit(userId, maxRequests, windowMs);

  if (!allowed) {
    return NextResponse.json(
      { error: "So'rovlar limiti oshdi. Biroz kuting.", code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(windowMs / 1000).toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}
