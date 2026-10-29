import { unstable_cache } from 'next/cache';
import { db } from './db';
import { logger } from './logger';
import { CACHE_TAGS, PUBLIC_CACHE_REVALIDATE_SEC } from './cache-tags';

// Reklama uchun bitta bepul test: tizimga kirgan HAR KIM uchun ochiq,
// yechimlari bilan. `accessType: 'free'` ataylab ishlatilmaydi — u testni
// mehmonga ham ochadi va yechimlarni baribir obunaga bog'laydi. Test id
// kodda emas: admin sozlamasi → env → nom bo'yicha qidiruv.

export const AD_FREE_TEST_KEY = 'ad_free_test_id';
export const AD_FREE_TEST_DEFAULT_TITLE = 'Attestatsiya mock testi №10';

async function queryAdFreeTestId(): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({ where: { key: AD_FREE_TEST_KEY } });
  const configured = setting?.value.trim() || process.env.AD_FREE_TEST_ID?.trim();
  if (configured) return configured;
  const byTitle = await db.test.findFirst({
    where: { titleUz: { equals: AD_FREE_TEST_DEFAULT_TITLE, mode: 'insensitive' }, isPublished: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return byTitle?.id ?? null;
}

// Paywall har so'rovda shuni so'raydi — bazaga emas, keshga. Sozlama
// o'zgarsa `revalidateSettings()`, test nomi o'zgarsa test katalogi tegi
// tozalaydi. Kesh birinchi chaqiruvda yaratiladi: modul import qilinishi
// (paywall'ni import qiladigan har bir route) kesh ro'yxatiga ta'sir qilmasin.
let cachedAdFreeTestId: (() => Promise<string | null>) | null = null;

function cached(): Promise<string | null> {
  cachedAdFreeTestId ??= unstable_cache(queryAdFreeTestId, ['ad-free-test-id'], {
    revalidate: PUBLIC_CACHE_REVALIDATE_SEC,
    tags: [CACHE_TAGS.settings, CACHE_TAGS.testsList],
  });
  return cachedAdFreeTestId();
}

/** Xatoda `null` — paywall yopiq tomonga og'adi, test hech qachon tasodifan ochilmaydi. */
export async function getAdFreeTestId(): Promise<string | null> {
  try {
    return await cached();
  } catch (error) {
    logger.error('getAdFreeTestId error:', { error });
    return null;
  }
}

export async function isAdFreeTest(testId: string): Promise<boolean> {
  const id = await getAdFreeTestId();
  return id !== null && id === testId;
}

/**
 * Hisobotdagi "boshlagan" ustuni — faqat birinchi ochilish. Yozuv xatosi
 * testni ochishga to'sqinlik qilmasin.
 */
export async function markAdTestStarted(userId: string): Promise<void> {
  try {
    await db.user.updateMany({ where: { id: userId, adTestStartedAt: null }, data: { adTestStartedAt: new Date() } });
  } catch (error) {
    logger.error('markAdTestStarted error:', { error });
  }
}
