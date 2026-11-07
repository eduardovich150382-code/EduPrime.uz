import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { PING_RESOLUTION_MS, touchLastActive } from '@/lib/last-active';

const NO_CONTENT = { status: 204, headers: { 'Cache-Control': 'private, no-store' } } as const;

/**
 * POST /api/me/ping — "onlayn" heartbeat (ActivityPing, har 2 daqiqada).
 *
 * Mehmon uchun ham 204: sessiya tugagan tab ping yuborishda davom etishi
 * mumkin, 401 esa loglarni shovqin bilan to'ldirardi. Kirgan foydalanuvchida
 * bitta shartli `updateMany` — alohida SELECT ham, javob tanasi ham yo'q.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    await touchLastActive(userId, new Date(), PING_RESOLUTION_MS).catch((error: unknown) => {
      logger.warn('ping touchLastActive failed', { error });
    });
  }
  return new Response(null, NO_CONTENT);
}
