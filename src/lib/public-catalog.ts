import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Prisma, TestType } from '@prisma/client';
import { db } from './db';
import { loadAttestationSettings } from './attestation-settings';
import { CACHE_TAGS, PUBLIC_CACHE_REVALIDATE_SEC } from './cache-tags';
import type { ContentCountRow } from './pricing';

// Hamma uchun bir xil bo'lgan katalog so'rovlari — Next data cache'da
// `PUBLIC_CACHE_REVALIDATE_SEC` gacha saqlanadi, mutatsiyalar `cache-tags.ts`
// orqali tozalaydi.
//
// QOIDALAR:
// - Bu yerda foydalanuvchiga bog'liq hech narsa yo'q (obuna, natija, ruxsat,
//   shaxsiy narx) — ular chaqiruvchida, keshdan tashqarida hisoblanadi.
// - Savol matni, variant, javob va yechim tanlanmaydi (paywall).
// - Date'lar shu yerda ISO satrga aylantiriladi: `unstable_cache` miss'da
//   jonli obyektni, hit'da JSON'dan tiklanganini qaytaradi — Date qolsa
//   birinchi so'rovda Date, keyingisida satr bo'lib, kod ikki xil ishlardi.

const cacheOptions = (tag: string) => ({ tags: [tag], revalidate: PUBLIC_CACHE_REVALIDATE_SEC });

// ---------------------------------------------------------------- pricing

// Fan kesimidagi sonlar bitta agregat so'rovda — mahsulot yoki fan soniga
// qarab so'rov ko'paymaydi.
function loadContentCounts(): Promise<ContentCountRow[]> {
  return db.$queryRaw<ContentCountRow[]>`
    SELECT t."categoryId", t."subjectId",
      (COUNT(DISTINCT t."id") FILTER (WHERE NOT t."isMock"))::int AS "topicTests",
      (COUNT(DISTINCT t."id") FILTER (WHERE t."isMock"))::int AS "mockTests",
      COUNT(q."id")::int AS "questions"
    FROM "Test" t LEFT JOIN "Question" q ON q."testId" = t."id"
    WHERE t."isPublished" = true
    GROUP BY t."categoryId", t."subjectId"
  `;
}

async function queryPricingCatalog() {
  const [products, counts] = await Promise.all([
    db.product.findMany({
      where: { isOnSale: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      omit: { createdAt: true, updatedAt: true },
      include: {
        // `untilDate` bu yerda filtrlanmaydi: kesh 5 daqiqa yashaydi, muddati
        // o'tgan variant chaqiruvchida joriy `now` bilan olib tashlanadi.
        offers: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] },
        category: { select: { type: true, subjects: {
          where: { tests: { some: { isPublished: true } } }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: { id: true, nameUz: true, nameRu: true, nameEn: true, isMandatory: true,
            _count: { select: { tests: { where: { isPublished: true } } } } },
        } } },
      },
    }),
    loadContentCounts(),
  ]);
  return {
    products: products.map((product) => ({
      ...product,
      offers: product.offers.map((offer) => ({
        ...offer,
        untilDate: offer.untilDate?.toISOString() ?? null,
        promoUntil: offer.promoUntil?.toISOString() ?? null,
      })),
    })),
    counts,
  };
}

export type PricingCatalog = Awaited<ReturnType<typeof queryPricingCatalog>>;

export const loadPricingCatalog = unstable_cache(queryPricingCatalog, ['public-catalog', 'pricing'], cacheOptions(CACHE_TAGS.pricing));

// ------------------------------------------------------------ attestation

export const ATTESTATION_TEST_SELECT = {
  id: true,
  isMock: true,
  titleUz: true,
  titleRu: true,
  titleEn: true,
  isFree: true,
  accessType: true,
  price: true,
  questionCount: true,
  subjectId: true,
  categoryId: true,
} satisfies Prisma.TestSelect;

async function queryAttestationCatalog() {
  const categories = await db.testCategory.findMany({ where: { type: 'ATTESTATION' }, select: { id: true, type: true } });
  // Test'da category relation yo'q — kategoriya id lari bo'yicha. Tartib
  // maydoni ham yo'q: createdAt o'sish (teng bo'lsa id — barqaror).
  const tests = categories.length
    ? await db.test.findMany({
        where: { isPublished: true, categoryId: { in: categories.map((c) => c.id) } },
        select: ATTESTATION_TEST_SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    : [];
  return { categories, tests };
}

export const loadAttestationCatalog = unstable_cache(queryAttestationCatalog, ['public-catalog', 'attestation'], cacheOptions(CACHE_TAGS.testsList));

export const cachedAttestationSettings = unstable_cache(loadAttestationSettings, ['public-catalog', 'attestation-settings'], cacheOptions(CACHE_TAGS.settings));

// ------------------------------------------------------------ /api/tests

export type TestsListSort = 'newest' | 'popular';

export interface TestsListParams {
  category: string | null;
  subject: string | null;
  type: TestType | null;
  sort: TestsListSort;
  page: number;
  limit: number;
}

// Kesh kaliti so'rov parametrlaridan tuziladi — ixtiyoriy qiymatlar
// cheksiz ko'p kalit yaratib, keshni to'ldirib yubormasin. 24 —
// /tests sahifasining PAGE_SIZE, 20 — limit berilmaganda.
export const DEFAULT_TESTS_LIMIT = 20;
export const ALLOWED_TESTS_LIMITS: readonly number[] = [DEFAULT_TESTS_LIMIT, 24];
export const MAX_CACHED_TESTS_PAGE = 50;

export function normalizeTestsListParams(raw: {
  category: string | null; subject: string | null; type: TestType | null;
  sort: string | null; page: string | null; limit: string | null;
}): TestsListParams {
  const limit = Number(raw.limit);
  return {
    category: raw.category || null,
    subject: raw.subject || null,
    type: raw.type,
    sort: raw.sort === 'popular' ? 'popular' : 'newest',
    // NaN yoki manfiy qiymat skip/take ga tushib Prisma xatosiga (500)
    // aylanmasin.
    page: Math.max(1, parseInt(raw.page || '1') || 1),
    limit: ALLOWED_TESTS_LIMITS.includes(limit) ? limit : DEFAULT_TESTS_LIMIT,
  };
}

/**
 * Keshdan o'tkazish mumkinmi. Qidiruv, juda uzoq sahifa va bazada yo'q
 * fan/kategoriya id'si keshsiz yo'lga ketadi — natija to'g'ri, lekin yangi
 * kesh kaliti yaratilmaydi.
 */
export async function canCacheTestsList(params: TestsListParams, q: string): Promise<boolean> {
  if (q || params.page > MAX_CACHED_TESTS_PAGE) return false;
  if (!params.category && !params.subject) return true;
  const subjects = await getSubjects(null);
  if (params.subject && !subjects.some((s) => s.id === params.subject)) return false;
  if (params.category && !subjects.some((s) => s.categoryId === params.category)) return false;
  return true;
}

/** `null` — `type` bo'yicha kategoriya yo'q (bo'sh ro'yxat). */
export async function queryTestsListPage(params: TestsListParams, q = '') {
  const where: Prisma.TestWhereInput = { isPublished: true };
  if (params.category) where.categoryId = params.category;
  if (params.subject) where.subjectId = params.subject;
  if (q) {
    // Qidiruv hozircha faqat test va fan nomi bo'yicha. Foydalanuvchi
    // ruscha/inglizcha nomni ham yozishi mumkin, shuning uchun uchala til.
    where.OR = [
      { titleUz: { contains: q, mode: 'insensitive' } },
      { titleRu: { contains: q, mode: 'insensitive' } },
      { titleEn: { contains: q, mode: 'insensitive' } },
      { subject: { nameUz: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // Filter by TestCategory type (DTM, SCHOOL, ATTESTATION, SAT, GRE, CERTIFICATE)
  if (params.type) {
    const matchingCategories = await db.testCategory.findMany({ where: { type: params.type }, select: { id: true } });
    if (matchingCategories.length === 0) return null;
    where.categoryId = { in: matchingCategories.map((c) => c.id) };
  }

  // "Ommabop" — necha marta yechilgani (TestResult soni). Teng bo'lsa
  // yangisi oldin, aks holda sahifalar orasida tartib sakrab ketadi.
  const orderBy: Prisma.TestOrderByWithRelationInput | Prisma.TestOrderByWithRelationInput[] =
    params.sort === 'popular'
      ? [{ results: { _count: 'desc' } }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

  const [tests, total] = await Promise.all([
    db.test.findMany({
      where,
      // Paywall: yozma va video yechim — pullik mahsulot, ro'yxatda ochiq
      // ketmasin. Ular natija sahifasida, access tekshiruvidan keyin beriladi.
      omit: { writtenSolution: true, videoSolution: true },
      include: { subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } } },
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    db.test.count({ where }),
  ]);

  // Kartadagi maqsad belgisi (Attestatsiya, DTM, ...) uchun. Test'da
  // category relation yo'q (faqat categoryId) — sahifadagi testlarning
  // kategoriyalari bitta so'rovda. Map JSON'ga sig'maydi — juftliklar.
  const categories = await db.testCategory.findMany({
    where: { id: { in: [...new Set(tests.map((t) => t.categoryId))] } },
    select: { id: true, type: true },
  });

  return {
    tests: tests.map((test) => ({ ...test, createdAt: test.createdAt.toISOString(), updatedAt: test.updatedAt.toISOString() })),
    total,
    categoryTypes: categories.map((c): [string, TestType] => [c.id, c.type]),
  };
}

export const getTestsListPage = unstable_cache(
  (params: TestsListParams) => queryTestsListPage(params),
  ['public-catalog', 'tests-list'],
  cacheOptions(CACHE_TAGS.testsList),
);

// ------------------------------------------------------- /api/settings

// Faqat shu kalitlar ommaga ochiq.
export const PUBLIC_SETTING_KEYS = [
  'payment_card_number',
  'payment_card_owner',
  'site_announcement',
  'telegram_support_username',
  'referral_friends_required',
  'referral_reward_days',
  'free_daily_test_limit',
  // /tests attestatsiya banneridagi "kun qoldi" hisoblagichi (YYYY-MM-DD).
  'attestation_date',
];

export const PUBLIC_SETTING_DEFAULTS: Record<string, string> = {
  payment_card_number: '',
  payment_card_owner: '',
  site_announcement: '',
  telegram_support_username: '',
  referral_friends_required: '3',
  referral_reward_days: '5',
  free_daily_test_limit: '3',
  // Bo'sh — hisoblagich yashirin, banner qoladi.
  attestation_date: '',
};

async function queryPublicSettings(): Promise<Record<string, string>> {
  const settings = await db.systemSetting.findMany({ where: { key: { in: PUBLIC_SETTING_KEYS } }, select: { key: true, value: true } });
  const result: Record<string, string> = { ...PUBLIC_SETTING_DEFAULTS };
  for (const s of settings) result[s.key] = s.value;
  return result;
}

export const getPublicSettings = unstable_cache(queryPublicSettings, ['public-catalog', 'settings'], cacheOptions(CACHE_TAGS.settings));

// ------------------------------------------------------- /api/subjects

async function querySubjects(type: TestType | null) {
  const subjects = await db.subject.findMany({
    where: type ? { category: { type } } : undefined,
    include: { category: { select: { nameUz: true, type: true } } },
    orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
  });
  return subjects.map((subject) => ({ ...subject, createdAt: subject.createdAt.toISOString() }));
}

export const getSubjects = unstable_cache(querySubjects, ['public-catalog', 'subjects'], cacheOptions(CACHE_TAGS.taxonomy));
