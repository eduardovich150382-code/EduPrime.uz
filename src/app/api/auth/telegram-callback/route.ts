import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as jose from 'jose';

// Derive encryption key the same way NextAuth v5 / Auth.js does internally
async function getDerivedEncryptionKey(secret: string, salt: string) {
  const encoder = new TextEncoder();
  const info = `Auth.js Generated Encryption Key (${salt})`;
  
  // Import the secret as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  // Derive 512 bits (64 bytes) using HKDF
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      info: encoder.encode(info),
    },
    baseKey,
    512
  );
  
  return new Uint8Array(derivedBits);
}

// This handles Telegram auth callback directly
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const telegramId = searchParams.get('telegramId');
  const username = searchParams.get('username') || '';
  const firstName = searchParams.get('firstName') || '';
  const token = searchParams.get('token');

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime-uz.vercel.app';
  const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!SECRET) {
    console.error('[Telegram Callback] AUTH_SECRET/NEXTAUTH_SECRET is not set');
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`);
  }

  if (!telegramId || !token) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_params`);
  }

  try {
    // Verify token from database
    const storedToken = await db.systemSetting.findUnique({
      where: { key: `telegram_auth_${telegramId}` },
    });

    if (!storedToken) {
      console.error('[Telegram Callback] Token not found for telegramId:', telegramId);
      return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
    }

    const tokenData = JSON.parse(storedToken.value);
    const isValid = tokenData.token === token;
    const isNotExpired = Date.now() - tokenData.createdAt < 5 * 60 * 1000;

    if (!isValid || !isNotExpired) {
      console.error('[Telegram Callback] Token invalid or expired');
      return NextResponse.redirect(`${APP_URL}/login?error=expired_token`);
    }

    // Delete used token
    await db.systemSetting.delete({
      where: { key: `telegram_auth_${telegramId}` },
    });

    // Find or create user
    let user = await db.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          telegramId,
          telegramUsername: username,
          name: firstName || username || 'Telegram User',
          role: 'USER',
          lang: 'uz',
        },
      });
    } else {
      if ((username && user.telegramUsername !== username) || (firstName && !user.name)) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            telegramUsername: username || user.telegramUsername,
            name: user.name || firstName || username,
          },
        });
      }
    }

    // Create session cookie (same way NextAuth v5 / Auth.js does internally)
    const isProduction = APP_URL.startsWith('https');
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    // Derive encryption key using Web Crypto HKDF (same as Auth.js)
    const keyMaterial = await getDerivedEncryptionKey(SECRET, cookieName);

    // Create JWE token (same format as NextAuth v5)
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.image,
      role: user.role,
      lang: user.lang,
      telegramId: user.telegramId,
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    const jweToken = await new jose.EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .encrypt(keyMaterial);

    // Set cookie and redirect to dashboard
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);

    response.cookies.set(cookieName, jweToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[Telegram Callback] Error:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`);
  }
}

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
