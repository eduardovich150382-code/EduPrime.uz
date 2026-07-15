import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// This endpoint is called by our Telegram bot to generate auth tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, username, firstName, botSecret } = body;

    // Verify request comes from our bot
    if (botSecret !== process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    // Generate a random auth token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token temporarily (5 minutes expiry)
    await db.systemSetting.upsert({
      where: { key: `telegram_auth_${telegramId}` },
      update: {
        value: JSON.stringify({
          token,
          username,
          firstName,
          createdAt: Date.now(),
        }),
      },
      create: {
        key: `telegram_auth_${telegramId}`,
        value: JSON.stringify({
          token,
          username,
          firstName,
          createdAt: Date.now(),
        }),
      },
    });

    // Return the auth URL (use /api/auth/telegram-callback for server-side session creation)
    const authUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/telegram-callback?telegramId=${telegramId}&username=${username || ''}&firstName=${encodeURIComponent(firstName || '')}&token=${token}`;

    return NextResponse.json({ authUrl, token });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
