import 'server-only';
import { db } from './db';

// `cron/notifications` faqat 3 kunlik nofaollikni tekshiradi — soatlik
// aniqlik yetarli. Har so'rovda UPDATE qilish esa bazaga ham, funksiya
// CPU'siga ham ortiqcha yuk edi.
const LAST_ACTIVE_RESOLUTION_MS = 60 * 60_000;

/**
 * Shart `where` ichida: oxirgi yozuv bir soatdan yangi bo'lsa qator
 * tegilmaydi — alohida SELECT kerak emas. Xato chaqiruvchiga qaytadi;
 * javobga ta'sir qilmasligi uchun chaqiruvchi `.catch` qiladi.
 */
export function touchLastActive(userId: string, now: Date) {
  return db.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: new Date(now.getTime() - LAST_ACTIVE_RESOLUTION_MS) } },
      ],
    },
    data: { lastActiveAt: now },
  });
}
