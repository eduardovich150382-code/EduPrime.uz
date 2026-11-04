import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { touchLastActive } from '@/lib/last-active';
import { loadSubscriptionStatusFor } from '@/lib/subscription-status';
import type { MeHeader } from '@/lib/me-header-store';

// Shaxsiy javob: CDN ham, brauzer ham saqlamasin (boshqa akkaunt soni yoki
// obunasi ko'rinib qolmasin; yangilik qachon so'ralishini klient hal qiladi).
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/me/header — header uchun bitta so'rov: o'qilmagan bildirishnomalar
 * soni va obuna holati. Avval ikki alohida route edi — har biri sovuq start
 * va `auth()` dekodi, kirgan foydalanuvchida har sahifada ikkalasi ketardi.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      const guest: MeHeader = { unreadCount: 0, subscription: null };
      return NextResponse.json(guest, { status: 401, headers: NO_STORE });
    }

    const now = new Date();
    const [unreadCount, subscription] = await Promise.all([
      db.notification.count({ where: { userId, isRead: false } }),
      loadSubscriptionStatusFor(userId, now),
      // Faollik belgisi javobga ta'sir qilmaydi: yozuv yiqilsa ham son va obuna qaytadi.
      touchLastActive(userId, now).catch((error: unknown) => { logger.warn('touchLastActive failed', { error }); }),
    ]);
    const body: MeHeader = { unreadCount, subscription };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (error) {
    logger.error('GET /api/me/header error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: NO_STORE });
  }
}
