import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sanitizeReturnPath } from '@/lib/safe-return-path';
import { verifyWebAppInitData } from '@/lib/telegram-webapp-auth';

// Kompyuterdagi Telegram'da Mini App o'rniga sayt tizim brauzerida ochiladi.
// Brauzerda Telegram imzosi yo'q, shuning uchun imzolangan initData evaziga
// bot /login oqimidagi bilan aynan bir xil bir martalik token beramiz
// (5 daqiqa, telegram-callback ishlatgach o'chiradi).
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  const initData = typeof record.initData === 'string' ? record.initData : '';
  const verified = verifyWebAppInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');
  if (!verified) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '');
  const next = sanitizeReturnPath(typeof record.next === 'string' ? record.next : null) ?? '/attestation';
  const telegramId = String(verified.user.id);
  const username = verified.user.username ?? '';
  const firstName = verified.user.first_name;
  const token = randomBytes(32).toString('hex');

  try {
    const value = JSON.stringify({ token, username, firstName, createdAt: Date.now() });
    await db.systemSetting.upsert({ where: { key: `telegram_auth_${telegramId}` }, update: { value }, create: { key: `telegram_auth_${telegramId}`, value } });
  } catch (error) {
    logger.error('[Telegram handoff] token save error', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const params = new URLSearchParams({ telegramId, username, firstName, token, next });
  return NextResponse.json({ url: `${appUrl}/api/auth/telegram-callback?${params.toString()}` });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
