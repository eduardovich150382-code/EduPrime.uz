import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AttestationActiveSubscription, AttestationOffer } from '../AttestationOffer';
import { TestRowList } from '../TestRowList';
import { attestationSubscription } from '@/lib/attestation-offer';
import type { MockRow } from '@/lib/attestation-page';
import type { PricingOffer, PricingProduct } from '@/lib/pricing';
import { subscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

vi.mock('next/navigation', async (original) => ({ ...await original<typeof import('next/navigation')>(), useRouter: () => ({ refresh: vi.fn() }) }));

// subscriptionNow — Toshkentda 25-oktabr 00:30.
const counts = { topicTests: 45, mockTests: 3, questions: 1689 };
const marketing = { compareAtPrice: null, promoUntil: null, badge: null, isFeatured: false, personalPrice: null, buyHref: '' };
const monthly: PricingOffer = { id: 'month', label: '1 oy', price: 49000, durationMonths: 1, untilDate: null, ...marketing };
const season: PricingOffer = { id: 'season', label: 'Mavsum davomida', price: 99000, durationMonths: null, untilDate: '2026-12-25T00:00:00+05:00', ...marketing };
const physics = { id: 'physics', name: 'Fizika', testCount: 12, isMandatory: false, counts };
const math = { id: 'math', name: 'Matematika', testCount: 4, isMandatory: false, counts };
const product: PricingProduct = {
  id: 'att', kind: 'CATEGORY', goal: 'ATTESTATION', name: 'Attestatsiya', subjectRule: 'ONE', secondSubjectDiscountPct: 25,
  tagline: null, features: [], counts: null, activeSubscriptions: [], subjects: [physics], offers: [monthly, season],
};
const guest = { userId: null, loginHref: '/login?callbackUrl=%2Fattestation', knownSubscriptionIds: [] };

function html(node: React.ReactNode, locale = 'uz') {
  // Intl raqam guruhlarini bo'linmas bo'shliq bilan ajratadi — tekshiruvda oddiy bo'shliq.
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : locale === 'en' ? en : uz} timeZone="Asia/Tashkent" now={now}>
    {node}
  </NextIntlClientProvider>).replace(/[  ]/g, ' ').replace(/<!-- -->/g, '');
}
function active(endDate: string, subjects = [physics]) {
  const owned = attestationSubscription([subscriptionView(sub({ endDate: new Date(endDate) }))], { ...product, subjects }, now)!;
  return html(<AttestationActiveSubscription subscription={owned.subscription} uncoveredSubjects={owned.uncoveredSubjects} discountPct={25} />);
}

describe('attestatsiya obuna kartasi', () => {
  it('mehmon: sarlavha fan bilan, afzalliklar, 2 variant, uzun muddat tavsiya etiladi, sotib olish kirishga', () => {
    const out = html(<AttestationOffer product={product} buy={guest} locale="uz" />);
    expect(out).toContain('Attestatsiyaga obuna — Fizika');
    expect(out).toContain('Barcha mavzu testlari'); expect(out).toContain('Barcha mock imtihonlar');
    expect(out).toContain('AI tushuntirish — kunlik limitsiz');
    expect(out).toContain('25-dekabrgacha · 61 kun'); expect(out).toContain('49 000');
    expect(out).toMatch(/Tavsiya etiladi<\/span><div[^>]*><h3[^>]*>Mavsum davomida</);
    expect(out.match(/Tavsiya etiladi/g)).toHaveLength(1);
    expect(out.match(/href="\/login\?callbackUrl=%2Fattestation"[^>]*>Sotib olish</g)).toHaveLength(2);
  });
  it('admin isFeatured qo‘ygan variant tavsiya etiladi (/pricing bilan bir xil)', () => {
    const out = html(<AttestationOffer product={{ ...product, offers: [{ ...monthly, isFeatured: true }, season] }} buy={guest} locale="uz" />);
    expect(out).toMatch(/Tavsiya etiladi<\/span><div[^>]*><h3[^>]*>1 oy</);
  });
  it('kirgan obunasiz: sayt checkout tugmasi', () => {
    const out = html(<AttestationOffer product={product} buy={{ ...guest, userId: 'u1' }} locale="uz" />);
    expect(out.match(/<button[^>]*>Sotib olish</g)).toHaveLength(2); expect(out).not.toContain('callbackUrl');
  });
  it('muddati o‘tgan sanagacha variant ko‘rsatilmaydi', () => {
    const out = html(<AttestationOffer product={{ ...product, offers: [monthly, { ...season, untilDate: '2026-10-20T00:00:00+05:00' }] }} buy={guest} locale="uz" />);
    expect(out).not.toContain('Mavsum davomida'); expect(out).not.toContain('Tavsiya etiladi');
  });
  it('ru/en: xom kalit chiqmaydi', () => {
    expect(html(<AttestationOffer product={product} buy={guest} locale="ru" />, 'ru')).toContain('Подписка на аттестацию — Fizika');
    expect(html(<AttestationOffer product={product} buy={guest} locale="en" />, 'en')).toContain('Recommended');
  });
});

describe('obunachi bloki', () => {
  it('16 kun: "Obunangiz faol", sana va kun, uzaytirish yo‘q', () => {
    const out = active('2026-11-10T12:00:00+05:00');
    expect(out).toContain('Obunangiz faol'); expect(out).toContain('10-noyabrgacha (16 kun)');
    expect(out).not.toContain('Uzaytirish'); expect(out).not.toContain('Boshqa fanga obuna');
  });
  it('2 kun qoldi: "Uzaytirish"', () => {
    const out = active('2026-10-27T12:00:00+05:00');
    expect(out).toContain('(2 kun)'); expect(out).toMatch(/href="\/pricing\?goal=ATTESTATION"[^>]*>Uzaytirish</);
  });
  it('fizika obunachisi, sotuvda Matematika ham: "Boshqa fanga obuna" −25%', () => {
    const out = active('2026-11-10T12:00:00+05:00', [physics, math]);
    expect(out).toMatch(/href="\/pricing\?goal=ATTESTATION"[^>]*>Boshqa fanga obuna<span[^>]*>−25%</);
  });
});

const row = (over: Partial<MockRow>): MockRow => ({
  id: 'r', number: 1, title: 'Mock', questionCount: 50, solved: false, lastScore: null, lastMax: null, lastPercent: null,
  ball: null, tier: null, primaryHref: '/tests/r/solve', secondaryHref: null, locked: false, lockBadge: null, ...over,
});

describe('TestRowList qulflangan qator', () => {
  const rows = [row({ id: 'free', title: 'Bepul' }), row({ id: 'paid', number: 2, locked: true, lockBadge: { kind: 'subscription' }, primaryHref: '/pricing' })];
  it('obunasizda yakorga: "Obuna bilan ochiladi"; bepul qator avvalgidek', () => {
    const out = html(<TestRowList title="Mock testlar" rows={rows} emptyText="" lockedHref="#obuna" />);
    expect(out).toMatch(/href="#obuna"[^>]*>.*?Obuna bilan ochiladi</);
    expect(out).toMatch(/href="\/tests\/r\/solve"[^>]*>Boshlash</);
    expect(out).not.toContain('href="/pricing"');
  });
  it('lockedHref berilmasa — eski havola', () => {
    const out = html(<TestRowList title="Mock testlar" rows={rows} emptyText="" />);
    expect(out).toContain('href="/pricing"'); expect(out).not.toContain('Obuna bilan ochiladi');
  });
});
