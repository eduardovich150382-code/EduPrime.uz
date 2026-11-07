import 'server-only';
import { db } from './db';

// `cron/notifications` faqat 3 kunlik nofaollikni tekshiradi — soatlik
// aniqlik yetarli. Har so'rovda UPDATE qilish esa bazaga ham, funksiya
// CPU'siga ham ortiqcha yuk edi.
export const LAST_ACTIVE_RESOLUTION_MS = 60 * 60_000;

// "Hozir onlayn" (5 daqiqalik oyna) uchun heartbeat aniqligi. Klient har
// 2 daqiqada ping yuboradi; shart tufayli UPDATE ham ko'pi bilan 2 daqiqada
// bir marta bo'ladi, oxirgi yozuv esa doim ~4 daqiqadan yangi — oynaga sig'adi.
export const PING_RESOLUTION_MS = 2 * 60_000;

/**
 * Shart `where` ichida: oxirgi yozuv `resolutionMs` dan yangi bo'lsa qator
 * tegilmaydi — alohida SELECT kerak emas. Xato chaqiruvchiga qaytadi;
 * javobga ta'sir qilmasligi uchun chaqiruvchi `.catch` qiladi.
 */
export function touchLastActive(userId: string, now: Date, resolutionMs: number = LAST_ACTIVE_RESOLUTION_MS) {
  return db.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: new Date(now.getTime() - resolutionMs) } },
      ],
    },
    data: { lastActiveAt: now },
  });
}
