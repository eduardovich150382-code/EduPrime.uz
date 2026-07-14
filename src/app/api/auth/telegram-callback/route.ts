import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encode } from 'next-auth/jwt';

// This handles Telegram auth callback directly
// Bot sends user here: /api/auth/telegram-callback?telegramId=...&token=...
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const telegramId = searchParams.get('telegramId');
  const username = searchParams.get('username') || '';
  const firstName = searchParams.get('firstName') || '';
  const token = searchParams.get('token');

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime-uz.vercel.app';

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
    const isNotExpired = Date.now() - tokenData.createdAt < 5 * 60 * 1000; // 5 min

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
      // Update username/name if changed
      if (username && user.telegramUsername !== username) {
        user = await db.user.update({
          where: { id: user.id },
          data: { 
            telegramUsername: username,
            name: user.name || firstName || username,
          },
        });
      }
    }

    // Create JWT token manually
    const jwtToken = await encode({
      token: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.image,
        role: user.role,
        lang: user.lang,
        telegramId: user.telegramId,
        sub: user.id,
      } as any,
      secret: process.env.NEXTAUTH_SECRET || 'development-secret',
      salt: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token',
    });

    // Set session cookie and redirect to dashboard
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);
    
    // Set the NextAuth session cookie
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-authjs.session-token' 
      : 'authjs.session-token';
    
    response.cookies.set(cookieName, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Telegram callback error:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`);
  }
}
