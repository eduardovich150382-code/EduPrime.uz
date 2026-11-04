import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { flushSentry, logger } from '@/lib/logger';

// Server Sentry SDK faqat birinchi xatoda yuklanadi (`lib/logger.ts`). Bu
// yo'l prod'da shu zanjir ishlayotganini qo'lda tekshirish uchun doimiy
// qoldirilgan: deploy'dan keyin yoki Sentry sozlamasi o'zgarganda admin
// ochadi va Sentry'da `source:sentry-test` tegi bo'yicha qidiradi.
//
// - oddiy: `logger.error` yo'li (Error + teglar + tozalash), flush kutiladi;
// - `?throw=1`: tutilmagan xato — `instrumentation.ts` dagi `onRequestError`.
//
// Ikkalasi ham faqat ADMIN uchun: aks holda har kim Sentry kvotasini
// yeydigan xato yaratib yuborardi.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const stamp = new Date().toISOString();

  if (request.nextUrl.searchParams.get('throw') === '1') {
    throw new Error(`sentry-test onRequestError ${stamp}`);
  }

  logger.error('Sentry sinov xatosi', {
    error: new Error(`sentry-test logger ${stamp}`),
    tags: { source: 'sentry-test' },
    adminId: user.id,
  });
  // Javob qaytgunga qadar yetkazilsin — admin `sent` orqali natijani
  // darhol ko'rsin (DSN yo'q bo'lsa `false`).
  const sent = await flushSentry();
  return NextResponse.json({ sent, stamp });
}
