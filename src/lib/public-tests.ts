import 'server-only';
import type { TestType } from '@prisma/client';
import { resolveTestAccess } from './access';
import { getTestsListPage, normalizeTestsListParams } from './public-catalog';
import { TESTS_PAGE_SIZE } from './tests-filters';
import type { TestItem } from '@/components/tests/TestCard';

export interface InitialTests { tests: TestItem[]; total: number }

type ListedTest = NonNullable<Awaited<ReturnType<typeof getTestsListPage>>>['tests'][number];

/**
 * Statik HTML'ga tushadigan karta — PAYWALL: faqat oq ro'yxatdagi
 * metama'lumot. `getTestsListPage` qatori Test'ning boshqa maydonlarini ham
 * olib keladi; ular sahifa HTML'iga (va RSC payload'iga) chiqmasin.
 * `hasAccess` — mehmon qoidasi; kirgan foydalanuvchi uchun klient
 * /api/tests dan qayta oladi.
 */
export function toPublicTestItem(test: ListedTest, categoryTypes: Map<string, TestType>): TestItem {
  const type = categoryTypes.get(test.categoryId);
  return {
    id: test.id,
    titleUz: test.titleUz,
    titleRu: test.titleRu,
    titleEn: test.titleEn,
    isFree: test.isFree,
    accessType: test.accessType,
    price: test.price,
    duration: test.duration,
    questionCount: test.questionCount,
    createdAt: test.createdAt,
    category: type ? { type } : null,
    hasAccess: resolveTestAccess(test, null),
  };
}

/** /tests filtrsiz birinchi sahifasi (yangi birinchi) — /api/tests bilan bir kesh kaliti. */
export async function loadInitialTests(): Promise<InitialTests> {
  const params = normalizeTestsListParams({
    category: null, subject: null, type: null, sort: null, page: '1', limit: String(TESTS_PAGE_SIZE),
  });
  const list = await getTestsListPage(params);
  if (!list) return { tests: [], total: 0 };
  const categoryTypes = new Map(list.categoryTypes);
  return { tests: list.tests.map((test) => toPublicTestItem(test, categoryTypes)), total: list.total };
}
