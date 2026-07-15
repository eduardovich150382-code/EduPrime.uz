import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EncryptJWT } from 'jose';
import { hkdf } from '@panva/hkdf';

// Derive encryption key the same way NextAuth v5 does internally
async function getDerivedEncryptionKey(secret: string, cookieName: string) {
  const info = `Auth.js Generated Encryption Key (${cookieName})`;
  return await hkdf('sha256', secret, cookieName, info, 64);
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
    // Verify token
    const storedToken = await db.systemSetting.findUnique({
      where: { key: `telegram_auth_${telegramId}` },
    });

    if (!storedToken) {
      return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
    }

    const tokenData = JSON.parse(storedToken.value);
    const isValid = tokenData.token === token;
    const isNotExpired = Date.now() - tokenData.createdAt < 5 * 60 * 1000;

    if (!isValid || !isNotExpired) {
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

    // Create JWT cookie (same way NextAuth v5 does it internally)
    const isProduction = APP_URL.startsWith('https');
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    // Derive key using HKDF (same as NextAuth v5)
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

    const jweToken = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .encrypt(new Uint8Array(keyMaterial));

    // Set cookie and redirect
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);

    response.cookies.set(cookieName, jweToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[Telegram Callback] Error:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`);
  }
}
