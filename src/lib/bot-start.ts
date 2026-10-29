import { db } from './db';
import { logger } from './logger';
import { parseAdStart, parseReferralStart } from './telegram-bot-links';

// Reklama attributsiyasi: har /start BotStart'ga yoziladi, foydalanuvchi
// keyin saytga kirganda birinchi manba User.firstSource'ga ko'chiriladi.
// Shunda "qaysi reklama ro'yxatdan o'tish va to'lov olib keldi" bitta
// ustun bo'yicha sanaladi (lib/ad-source-report.ts).

/** Botsiz (sayt orqali) kelgan foydalanuvchi — qayta-qayta BotStart so'ralmasligi uchun ham belgi. */
export const WEB_SOURCE = 'web';

export function startSource(param: string): string {
  if (!param) return 'organic';
  if (parseAdStart(param)) return param;
  if (parseReferralStart(param)) return 'ref';
  if (param.startsWith('ci_') || param.startsWith('buy') || param === 'obuna') return 'checkout';
  if (param === 'login') return 'login';
  // Noto'g'ri ad_ kodi ham shu yerga — hisobotni ixtiyoriy matn bilan to'ldirmaydi.
  return 'other';
}

/** Yozish xatosi bot javobini to'xtatmasligi kerak — shuning uchun hech qachon throw qilmaydi. */
export async function recordBotStart(telegramId: number, param: string): Promise<void> {
  try {
    const id = BigInt(telegramId);
    const previous = await db.botStart.findFirst({ where: { telegramId: id }, select: { id: true } });
    await db.botStart.create({ data: { telegramId: id, source: startSource(param), isFirst: !previous } });
  } catch (error) {
    logger.error('BotStart record error:', { error });
  }
}

/**
 * Login paytida chaqiriladi; chaqiruvchi `firstSource` bo'shligini o'zi
 * tekshiradi, shuning uchun to'ldirilgan foydalanuvchida so'rov ketmaydi.
 * BotStart umuman bo'lmasa 'web' yoziladi — aks holda saytdan kirgan har
 * bir foydalanuvchi uchun har login'da shu qidiruv takrorlanardi.
 */
export async function attachFirstSource(userId: string, telegramId: string | null): Promise<void> {
  try {
    let source = WEB_SOURCE;
    if (telegramId && /^\d+$/.test(telegramId)) {
      const first = await db.botStart.findFirst({
        where: { telegramId: BigInt(telegramId) },
        orderBy: { createdAt: 'asc' },
        select: { source: true },
      });
      if (first) source = first.source;
    }
    // Parallel login'lar bir-birini qayta yozmasin.
    await db.user.updateMany({ where: { id: userId, firstSource: null }, data: { firstSource: source } });
  } catch (error) {
    logger.error('attachFirstSource error:', { error });
  }
}

/** /admin xabari uchun: shu vaqtdan beri birinchi marta /start bosganlar. */
export function countFirstStarts(since: Date): Promise<number> {
  return db.botStart.count({ where: { isFirst: true, createdAt: { gte: since } } });
}
