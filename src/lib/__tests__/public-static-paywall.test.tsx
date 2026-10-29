import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import uz from '@/messages/uz.json';

// /attestation, /pricing va /tests statik (ISR) — HTML hamma uchun bir xil
// va CDN'da turadi. Bu yerda eng yomon holat: keshlangan katalog
// funksiyalari pullik kontentni ham qaytarib yubordi (savol matni, variant,
// javob, yechim, natija javoblari). Sahifa qatlami baribir faqat oq
// ro'yxatdagi maydonlarni chizishi kerak. Keshning o'zi select/omit bilan
// `public-catalog.test.ts` da tekshiriladi — bu ikkinchi himoya qatori.

const SECRETS = ['SECRET_TEXT', 'SECRET_OPTION', 'SECRET_ANSWER', 'SECRET_EXPLANATION', 'SECRET_WRITTEN', 'SECRET_VIDEO', 'SECRET_RESULT'];
const leak = {
  text: 'SECRET_TEXT', options: [{ label: 'A', text: 'SECRET_OPTION' }], correctAnswer: 'SECRET_ANSWER', explanation: 'SECRET_EXPLANATION',
  writtenSolution: 'SECRET_WRITTEN', videoSolution: 'SECRET_VIDEO', answers: [{ questionId: 'q1', answer: 'SECRET_RESULT' }],
};
const leakyQuestion = { id: 'q1', testId: 't1', tags: [], topic: null, ...leak };

const m = vi.hoisted(() => ({ question: vi.fn(), testResult: vi.fn(), queryRaw: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/db', () => ({
  db: { question: { findMany: m.question }, testResult: { findMany: m.testResult }, $queryRaw: m.queryRaw },
}));
// Statik render'da sessiya hali yo'q — SessionProvider'ning dastlabki holati.
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'loading' }) }));
const router = { refresh: vi.fn(), replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() };
vi.mock('next/navigation', async (original) => ({
  ...await original<typeof import('next/navigation')>(),
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
// next-intl navigatsiyasi next/navigation'ni o'zi import qiladi — mock unga yetmaydi.
vi.mock('@/i18n/routing', async (original) => ({
  ...await original<typeof import('@/i18n/routing')>(),
  useRouter: () => router,
  usePathname: () => '/tests',
}));

const attTest = {
  id: 't1', isMock: true, titleUz: 'Mock 1', titleRu: null, titleEn: null, isFree: false, accessType: 'subscription',
  price: 0, questionCount: 50, subjectId: 'physics', categoryId: 'att', duration: 90,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z',
  ...leak, questions: [leakyQuestion], subject: { nameUz: 'Fizika', nameRu: null, nameEn: null, icon: null },
};
const subject = { id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', isMandatory: false, _count: { tests: 1 }, ...leak };
const product = {
  id: 'p', kind: 'CATEGORY', categoryId: 'att', subjectRule: 'ONE', secondSubjectDiscountPct: 25, isOnSale: true, order: 0,
  nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation',
  taglineUz: null, taglineRu: null, taglineEn: null, featuresUz: [], featuresRu: [], featuresEn: [],
  category: { type: 'ATTESTATION', subjects: [subject] }, ...leak,
  offers: [{
    id: 'o1', productId: 'p', labelUz: '1 oy', labelRu: '1 мес', labelEn: '1 month', durationMonths: 1, untilDate: null, price: 49000,
    isActive: true, order: 0, compareAtPrice: null, badgeUz: null, badgeRu: null, badgeEn: null, isFeatured: false, promoUntil: null, ...leak,
  }],
};

vi.mock('@/lib/public-catalog', () => ({
  loadAttestationCatalog: async () => ({ categories: [{ id: 'att', type: 'ATTESTATION' }], tests: [attTest] }),
  cachedAttestationSettings: async () => ({ date: '2026-12-01', durationMin: 120, tiers: { tier2: 60, tier1: 70, top: 80, topBonus: 86 } }),
  loadPricingCatalog: async () => ({ products: [product], counts: [{ categoryId: 'att', subjectId: 'physics', topicTests: 0, mockTests: 1, questions: 50 }] }),
  getTestsListPage: async () => ({ tests: [attTest], total: 1, categoryTypes: [['att', 'ATTESTATION']] }),
  normalizeTestsListParams: (raw: { page: string; limit: string }) => ({
    category: null, subject: null, type: null, sort: 'newest', page: Number(raw.page), limit: Number(raw.limit),
  }),
}));

import { loadAttestationPage, type AttestationPersonalData } from '../attestation-page';
import { loadPricingPage } from '../pricing-page';
import { loadInitialTests } from '../public-tests';
import { buildAttestationView } from '../attestation-offer';
import {
  AttestationPersonalProvider, HeroActions, OfferSlot, RowsSlot, SidePanelSlot,
} from '@/components/attestation/AttestationPersonal';
import { PricingPersonal } from '@/components/pricing/PricingPersonal';
import { TestsPage } from '@/components/tests/TestsPageContent';

const NOW = new Date('2026-10-29T10:00:00Z');

function html(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent" now={NOW}>{node}</NextIntlClientProvider>,
  );
}

function expectNoSecrets(value: string) {
  for (const secret of SECRETS) expect(value).not.toContain(secret);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.queryRaw.mockResolvedValue([]);
});

describe('statik sahifalar — paywall', () => {
  it('/attestation: mehmon ma’lumoti va HTML’da savol, variant, javob, yechim yo‘q; savollar so‘ralmaydi', async () => {
    const [page, pricing] = await Promise.all([loadAttestationPage(null, 'uz'), loadPricingPage(null, 'uz', NOW)]);
    const guest: AttestationPersonalData = {
      mockRows: page.mockRows, topicRows: page.topicRows, hero: page.hero, readiness: null,
      view: buildAttestationView(pricing, { userId: null, loginHref: '/login?callbackUrl=%2Fattestation' }, NOW),
    };
    expectNoSecrets(JSON.stringify(guest));
    const markup = html(
      <AttestationPersonalProvider locale="uz" guest={guest}>
        <HeroActions /><OfferSlot />
        <RowsSlot kind="mock" title="Mocklar" emptyText="-" /><SidePanelSlot loginHref="/login" />
      </AttestationPersonalProvider>,
    );
    expectNoSecrets(markup);
    expect(markup).toContain('Mock 1');
    expect(m.question).not.toHaveBeenCalled();
    expect(m.testResult).not.toHaveBeenCalled();
  });

  it('/pricing: katalog HTML’ida faqat narx va mahsulot ma’lumoti', async () => {
    const data = await loadPricingPage(null, 'uz', NOW);
    expectNoSecrets(JSON.stringify(data));
    const markup = html(<PricingPersonal guest={data} locale="uz" />);
    expectNoSecrets(markup);
    expect(markup).toContain('49');
  });

  it('/tests: birinchi sahifa kartalari faqat oq ro‘yxatdagi metama’lumot', async () => {
    const initial = await loadInitialTests();
    expect(Object.keys(initial.tests[0]).sort()).toEqual([
      'accessType', 'category', 'createdAt', 'duration', 'hasAccess', 'id', 'isFree', 'price', 'questionCount', 'titleEn', 'titleRu', 'titleUz',
    ]);
    expectNoSecrets(JSON.stringify(initial));
    const markup = html(<TestsPage initial={initial} attestationDate="2026-12-01" />);
    expectNoSecrets(markup);
    expect(markup).toContain('Mock 1');
  });
});

describe('statik sahifalar — birinchi ekran', () => {
  it('sessiya noma’lum: mehmon CTA’si HTML’da bor, kirgan uchun skeleton ham (CSS ishorasi tanlaydi)', async () => {
    const [page, pricing] = await Promise.all([loadAttestationPage(null, 'uz'), loadPricingPage(null, 'uz', NOW)]);
    const guest: AttestationPersonalData = {
      mockRows: page.mockRows, topicRows: page.topicRows, hero: page.hero, readiness: null,
      view: buildAttestationView(pricing, { userId: null, loginHref: '/login?callbackUrl=%2Fattestation' }, NOW),
    };
    const markup = html(
      <AttestationPersonalProvider locale="uz" guest={guest}>
        <OfferSlot /><SidePanelSlot loginHref="/login?callbackUrl=%2Fattestation" />
      </AttestationPersonalProvider>,
    );
    expect(markup).toContain('class="viewer-guest"');
    expect(markup).toContain('class="viewer-authed"');
    // Mehmon: kirish havolasi va sotib olish (kirishga olib boradi) darhol ko'rinadi.
    expect(markup).toContain(uz.attestation.guest.cta);
    expect(markup).toContain('href="/login?callbackUrl=%2Fattestation"');

    const tests = html(<TestsPage initial={await loadInitialTests()} attestationDate={null} />);
    // Spinner emas — kartalar statik HTML'da va opacity 0 dan boshlanmaydi.
    expect(tests).not.toContain('Yuklanmoqda');
    expect(tests).not.toContain('opacity:0');
  });
});
