import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bazadagi to'liq qatorlar — pullik kontent (savol matni, variant, javob,
// yechim, natija javoblari) ichki relation'larda ham bor. Mock Prisma kabi
// `select`/`omit`/`include` ni qo'llaydi: keshlangan funksiya ortiqcha narsa
// so'rasa, u natijaga tushadi va pastdagi rekursiv tekshiruv yiqiladi.
const m = vi.hoisted(() => ({
  registrations: [] as { keyParts: string[]; options: { tags?: string[]; revalidate?: number | false } }[],
  queryRaw: vi.fn(),
  calls: {} as Record<string, unknown[]>,
  // Fikstura pastda e'lon qilinadi; mock fabrikasi yuqoriga ko'tariladi,
  // shuning uchun qatorlar chaqiruv paytida shu orqali olinadi.
  findMany: null as null | ((model: string, args: unknown) => Promise<unknown[]>),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  unstable_cache: <T>(fn: T, keyParts: string[], options: { tags?: string[]; revalidate?: number | false }) => {
    m.registrations.push({ keyParts, options });
    return fn;
  },
}));

type Row = Record<string, unknown>;
type Args = { select?: Row; omit?: Record<string, boolean>; include?: Row } | undefined;

const isObject = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value);
const isRelation = (value: unknown) => isObject(value) || (Array.isArray(value) && value.some(isObject));

function shapeRelation(value: unknown, args: unknown): unknown {
  const nested = (args === true ? {} : args) as Args;
  return Array.isArray(value) ? value.map((v) => shape(v as Row, nested)) : value === null ? null : shape(value as Row, nested);
}

function shape(row: Row, args: Args): Row {
  const out: Row = {};
  if (args?.select) {
    for (const [key, value] of Object.entries(args.select)) {
      if (!value) continue;
      out[key] = value === true || key === '_count' ? row[key] : shapeRelation(row[key], value);
    }
    return out;
  }
  for (const [key, value] of Object.entries(row)) {
    if (args?.omit?.[key]) continue;
    if (isRelation(value)) {
      if (args?.include?.[key]) out[key] = shapeRelation(value, args.include[key]);
    } else out[key] = value;
  }
  return out;
}

const question = {
  id: 'q1', testId: 't1', tags: ['section:fizika'], topic: 'Mexanika',
  text: 'Savol matni', options: [{ label: 'A', text: 'variant' }], correctAnswer: 'A',
  explanation: 'yechim', explanationImages: ['img'],
};
const test = {
  id: 't1', titleUz: 'Kinematika', titleRu: null, titleEn: null, categoryId: 'att', subjectId: 'physics',
  isPublished: true, isMock: false, isFree: false, accessType: 'subscription', price: 0, duration: 60, questionCount: 1,
  format: 'MULTIPLE_CHOICE', difficulty: 3, coverImage: null, teacherId: null, userId: null,
  writtenSolution: 'pullik yechim', videoSolution: 'https://youtu.be/secret',
  createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
  questions: [question], results: [{ id: 'r1', answers: [{ questionId: 'q1', answer: 'A' }] }],
  subject: { id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: null, createdAt: new Date('2026-01-01T00:00:00Z') },
};
const subject = {
  id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: null, isMandatory: false, disciplineKey: null,
  categoryId: 'att', order: 0, createdAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'att', nameUz: 'Attestatsiya', type: 'ATTESTATION', createdAt: new Date('2026-01-01T00:00:00Z') },
  tests: [test], _count: { tests: 1 },
};
const category = { id: 'att', nameUz: 'Attestatsiya', type: 'ATTESTATION', createdAt: new Date('2026-01-01T00:00:00Z'), subjects: [subject] };
const NOW = new Date('2026-10-29T10:00:00Z');
const offer = (id: string, untilDate: Date | null) => ({
  id, productId: 'p', labelUz: 'Oy', labelRu: 'Месяц', labelEn: 'Month', durationMonths: untilDate ? null : 1, untilDate, price: 49000,
  isActive: true, order: 0, compareAtPrice: 70000, badgeUz: null, badgeRu: null, badgeEn: null, isFeatured: false,
  promoUntil: new Date('2026-11-01T00:00:00Z'),
});
const product = {
  id: 'p', kind: 'CATEGORY', categoryId: 'att', subjectRule: 'ONE', nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation',
  isOnSale: true, secondSubjectDiscountPct: 25, order: 0, taglineUz: null, taglineRu: null, taglineEn: null,
  featuresUz: [], featuresRu: [], featuresEn: [], createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-02T00:00:00Z'),
  // Muddati o'tgan variant ham keshga tushadi — filtr chaqiruvchida.
  offers: [offer('expired', new Date(NOW.getTime() - 1)), offer('monthly', null)],
  category, subscriptions: [{ id: 's1', userId: 'u1' }], payments: [{ id: 'pay1' }],
};
const settings = [
  { key: 'site_announcement', value: 'Salom', updatedAt: new Date() },
  { key: 'attestation_date', value: '2026-12-01', updatedAt: new Date() },
  { key: 'attestation_tier_highest', value: '86', updatedAt: new Date() },
];

const rows: Record<string, Row[]> = { product: [product], testCategory: [category], test: [test], systemSetting: settings, subject: [subject] };
m.findMany = async (model, args) => {
  (m.calls[model] ??= []).push(args);
  // Sozlamalar kalit bo'yicha so'raladi — boshqa kalit natijaga tushmasin.
  const keys = (args as { where?: { key?: { in?: string[] } } } | undefined)?.where?.key?.in;
  return rows[model].filter((row) => !keys || keys.includes(row.key as string)).map((row) => shape(row, args as Args));
};

vi.mock('@/lib/db', () => {
  const model = (name: string) => ({ findMany: (args: unknown) => m.findMany?.(name, args) ?? Promise.resolve([]) });
  return {
    db: {
      product: model('product'),
      testCategory: model('testCategory'),
      test: { ...model('test'), count: async () => 1 },
      systemSetting: model('systemSetting'),
      subject: model('subject'),
      $queryRaw: (...args: unknown[]) => m.queryRaw(...args),
    },
  };
});

import {
  cachedAttestationSettings, getPublicSettings, getSubjects, getTestsListPage, loadAttestationCatalog, loadPricingCatalog,
} from '../public-catalog';
import { loadPricingPage } from '../pricing-page';

const PAID_KEYS = ['questions', 'text', 'options', 'correctAnswer', 'explanation', 'explanationImages', 'writtenSolution', 'videoSolution', 'answers', 'results'];

// `questions` sanoq sifatida (kontent sonlari, son) ruxsat — ro'yxat/obyekt emas.
function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, keys));
  else if (isObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (!(key === 'questions' && typeof nested === 'number')) keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

const catalogs = [
  ['loadPricingCatalog', () => loadPricingCatalog()],
  ['loadAttestationCatalog', () => loadAttestationCatalog()],
  ['cachedAttestationSettings', () => cachedAttestationSettings()],
  ['getTestsListPage', () => getTestsListPage({ category: null, subject: null, type: null, sort: 'newest', page: 1, limit: 20 })],
  ['getPublicSettings', () => getPublicSettings()],
  ['getSubjects', () => getSubjects(null)],
] as const;

beforeEach(() => {
  m.queryRaw.mockResolvedValue([{ categoryId: 'att', subjectId: 'physics', topicTests: 1, mockTests: 0, questions: 1 }]);
  for (const key of Object.keys(m.calls)) delete m.calls[key];
});

describe('public katalog keshi', () => {
  it.each(catalogs)('%s: natijada savol matni, variant, javob va yechim kalitlari yo‘q (rekursiv)', async (_name, load) => {
    const keys = collectKeys(await load());
    for (const key of PAID_KEYS) expect(keys.has(key), key).toBe(false);
  });

  it.each(catalogs)('%s: natija JSON\'dan tiklanganda o‘zgarmaydi (Date yo‘q — miss va hit bir xil)', async (_name, load) => {
    const result = await load();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('har kesh o‘z tegi va 300 s muddati bilan ro‘yxatdan o‘tgan', () => {
    const byKey = Object.fromEntries(m.registrations.map((r) => [r.keyParts.join('/'), r.options]));
    expect(byKey).toEqual({
      'public-catalog/pricing': { tags: ['pricing'], revalidate: 300 },
      'public-catalog/attestation': { tags: ['tests-list'], revalidate: 300 },
      'public-catalog/attestation-settings': { tags: ['settings'], revalidate: 300 },
      'public-catalog/tests-list': { tags: ['tests-list'], revalidate: 300 },
      'public-catalog/settings': { tags: ['settings'], revalidate: 300 },
      'public-catalog/subjects': { tags: ['taxonomy'], revalidate: 300 },
    });
  });

  it('pricing: kesh kaliti vaqtga bog‘lanmagan — muddati o‘tgan variant keshda, sahifada joriy vaqt bilan chiqariladi', async () => {
    const catalog = await loadPricingCatalog();
    const [args] = m.calls.product as { include: { offers: { where: unknown } } }[];
    expect(args.include.offers.where).toEqual({ isActive: true });
    expect(catalog.products[0].offers.map((o) => [o.id, o.untilDate])).toEqual([
      ['expired', new Date(NOW.getTime() - 1).toISOString()], ['monthly', null],
    ]);
    const page = await loadPricingPage(null, 'uz', NOW);
    expect(page.products[0].offers.map((o) => o.id)).toEqual(['monthly']);
  });

  it('pricing: foydalanuvchi ma’lumoti (obuna, to‘lov) katalogga tushmaydi', async () => {
    const keys = collectKeys(await loadPricingCatalog());
    expect(keys.has('subscriptions')).toBe(false);
    expect(keys.has('payments')).toBe(false);
  });

  it('public sozlamalar: faqat ruxsat etilgan kalitlar, standartlar bilan', async () => {
    const result = await getPublicSettings();
    expect(result).toMatchObject({ site_announcement: 'Salom', attestation_date: '2026-12-01', referral_reward_days: '5' });
    expect(result).not.toHaveProperty('attestation_tier_highest');
  });
});
