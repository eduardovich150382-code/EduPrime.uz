import 'server-only';
import type { UserRole } from '@prisma/client';
import { db } from './db';
import { tashkentDayRangeUtc } from './date';

// "Onlayn" — kirgan foydalanuvchining lastActiveAt'i so'nggi 5 daqiqada.
// Ping har 2 daqiqada (PING_RESOLUTION_MS), shuning uchun faol tab oynadan
// tushib qolmaydi; tab yopilsa foydalanuvchi ~5 daqiqada ro'yxatdan chiqadi.
export const ONLINE_WINDOW_MS = 5 * 60_000;
export const ONLINE_USERS_LIMIT = 200;
const WEEK_MS = 7 * 24 * 60 * 60_000;

export interface OnlineCounts { onlineNow: number; activeToday: number; active7d: number }

export interface OnlineUser {
  id: string; name: string | null; telegramUsername: string | null; email: string | null;
  role: UserRole; lastActiveAt: Date | null; hasSubscription: boolean; hasTelegram: boolean; inTest: boolean;
}

export function onlineThresholds(now: Date) {
  return {
    online: new Date(now.getTime() - ONLINE_WINDOW_MS),
    // "Bugun" — Toshkent yarim tunidan (UTC+5); toISOString() UTC kunini berardi.
    today: tashkentDayRangeUtc(0, now).start,
    week: new Date(now.getTime() - WEEK_MS),
  };
}

// Uchala son `lastActiveAt` indeksi bo'yicha diapazon COUNT — har biri arzon.
export async function loadOnlineCounts(now: Date): Promise<OnlineCounts> {
  const t = onlineThresholds(now);
  const [onlineNow, activeToday, active7d] = await Promise.all([
    db.user.count({ where: { lastActiveAt: { gte: t.online } } }),
    db.user.count({ where: { lastActiveAt: { gte: t.today } } }),
    db.user.count({ where: { lastActiveAt: { gte: t.week } } }),
  ]);
  return { onlineNow, activeToday, active7d };
}

/**
 * Hozir onlayn foydalanuvchilar — bitta so'rov: filtrlangan `_count`
 * subquery sifatida shu SELECT ichida hisoblanadi (N+1 yo'q).
 * `inTest` faqat TestSession (konstruktor) uchun: oddiy Test urinishi
 * serverda ochiq holat qoldirmaydi — natija faqat topshirilganda yoziladi.
 */
export async function loadOnlineUsers(now: Date): Promise<OnlineUser[]> {
  const t = onlineThresholds(now);
  const rows = await db.user.findMany({
    where: { lastActiveAt: { gte: t.online } },
    orderBy: { lastActiveAt: 'desc' },
    take: ONLINE_USERS_LIMIT,
    select: {
      id: true, name: true, telegramUsername: true, email: true, role: true, lastActiveAt: true, telegramId: true,
      _count: {
        select: {
          subscriptions: { where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } },
          testSessions: { where: { submittedAt: null, expiresAt: { gt: now } } },
        },
      },
    },
  });
  return rows.map(({ _count, telegramId, ...user }) => ({
    ...user,
    // telegramId klientga chiqmaydi — Xabar oynasiga faqat "ulanganmi" kerak.
    hasTelegram: Boolean(telegramId),
    hasSubscription: _count.subscriptions > 0,
    inTest: _count.testSessions > 0,
  }));
}
