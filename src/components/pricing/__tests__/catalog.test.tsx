import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { PricingCatalog } from '../PricingCatalog';
import PricingSection from '@/components/landing/PricingSection';
import type { PricingProduct } from '@/lib/pricing';
import { subscriptionView, type SubscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

vi.mock('next/navigation', async (original) => ({ ...await original<typeof import('next/navigation')>(), useRouter: () => ({ refresh: vi.fn() }) }));

const counts = { topicTests: 45, mockTests: 3, questions: 1689 };
const marketing = { compareAtPrice: null, promoUntil: null, badge: null, isFeatured: false, personalPrice: null };
const product: PricingProduct = {
  id: 'p', kind: 'CATEGORY', goal: 'ATTESTATION', name: 'Attestatsiya', subjectRule: 'ONE', secondSubjectDiscountPct: 25,
  tagline: 'Toifangizni ishonch bilan oshiring', features: ['Haftalik jonli tahlil'], counts: null, activeSubscriptions: [],
  subjects: [{ id: 'physics', name: 'Fizika', testCount: 12, isMandatory: false, counts }], offers: [
    { id: 'o1', label: '1 oy', price: 49000, durationMonths: 1, untilDate: null, ...marketing },
    { id: 'o2', label: 'Mavsum', price: 99000, durationMonths: null, untilDate: '2026-11-24T19:30:00Z', ...marketing },
  ],
};
const promo = (extra: Partial<PricingProduct['offers'][number]>) => ({ ...product, offers: [{ ...product.offers[0], ...extra }, product.offers[1]] });
const bundle: PricingProduct = { ...product, id: 'all', kind: 'BUNDLE', goal: null, name: 'Hammasi', subjectRule: 'NONE', subjects: [], tagline: null, features: [],
  counts: { topicTests: 120, mockTests: 8, questions: 4321 }, offers: [{ ...product.offers[0], id: 'b1', price: 79000 }] };
function render(products = [product], locale = 'uz', subscriptions: SubscriptionView[] = [], goal?: string, userId: string | null = null) {
  // Intl raqam guruhlarini bo'linmas bo'shliq bilan ajratadi — tekshiruvda oddiy bo'shliq.
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : locale === 'en' ? en : uz} timeZone="Asia/Tashkent" now={new Date('2026-10-24')}>
    <PricingCatalog products={products} subscriptions={subscriptions} locale={locale} goal={goal} userId={userId} />
  </NextIntlClientProvider>).replace(/[  ]/g, ' ');
}
describe('pricing ko‘rinishi', () => {
  it('yagona kategoriyada tanlov yo‘q; fanlar, ikki variant va chegirma chiqadi', () => {
    const html = render();
    expect(html).not.toContain('<nav'); expect(html).toContain('Ikkinchi fanga −25%'); expect(html).toContain('Bitta fan tanlanadi');
    expect(html).toContain('25-noyabr'); expect(html.match(/>Sotib olish</g)).toHaveLength(2);
    expect(html).not.toContain('<select'); expect(html).not.toContain('Faol obunalaringiz');
  });
  it('karta: shior, sonlar, avtomatik va admin afzalliklari, muddat, to‘lov yozuvi', () => {
    const html = render().replace(/<!-- -->/g, '');
    expect(html).toContain('Toifangizni ishonch bilan oshiring');
    expect(html).toContain('3 ta mock'); expect(html).toContain('45 ta mavzu testi'); expect(html).toContain('1 600+ ta savol');
    expect(html).toContain('Barcha mavzu testlari'); expect(html).toContain('Barcha mock imtihonlar');
    expect(html).toContain('AI tushuntirish — kunlik limitsiz'); expect(html).toContain('Haftalik jonli tahlil');
    expect(html).not.toContain('cheksiz urinish');
    expect(html).toContain('25-noyabrgacha · 32 kun'); expect(html).toContain('To‘lov Telegram bot orqali');
    expect(html).toContain('Ko‘p beriladigan savollar');
  });
  it('bir nechta fanli ONE: sonlar fan kesimida, yig‘indi yo‘q', () => {
    const math = { id: 'math', name: 'Matematika', testCount: 4, isMandatory: false, counts: { topicTests: 4, mockTests: 0, questions: 40 } };
    const html = render([{ ...product, subjects: [...product.subjects, math] }]).replace(/<!-- -->/g, '');
    expect(html).toContain('3 ta mock · 45 ta mavzu testi · 1 600+ ta savol'); expect(html).toContain('4 ta mavzu testi · 40 ta savol');
    expect(html).not.toContain('49 ta mavzu testi');
  });
  it('eski narx: −30%, tejash va hisoblagich; ajratilgan variant tasma va to‘liq tugma bilan', () => {
    const html = render([promo({ compareAtPrice: 70000, promoUntil: '2026-10-26T05:00:00Z', isFeatured: true })]).replace(/<!-- -->/g, '');
    expect(html).toContain('−30%'); expect(html).toContain('21 000 so‘m tejaysiz');
    expect(html).toContain('Aksiya tugashiga 2 kun 5 soat'); expect(html).toContain('Eng foydali');
    expect(html.match(/border-2 border-primary-600/g)).toHaveLength(1);
  });
  it('aksiya tugagach eski narx va hisoblagich ko‘rinmaydi', () => {
    const html = render([promo({ compareAtPrice: 70000, promoUntil: '2026-10-23T05:00:00Z' })]);
    expect(html).not.toContain('−30%'); expect(html).not.toContain('Aksiya tugashiga');
  });
  it('obunachi: shu kartada faol muddat, uzaytirish izohi va shaxsiy narx', () => {
    const html = render([{ ...promo({ personalPrice: 36750 }), activeSubscriptions: [{ id: 's', endDate: '2026-11-24T19:30:00Z', subjects: ['Fizika'] }] }], 'uz', [], undefined, 'u1')
      .replace(/<!-- -->/g, '');
    expect(html).toContain('Sizda faol — 25-noyabrgacha · Fizika'); expect(html).toContain('href="#variants-p"');
    expect(html).toContain('joriy obuna tugagan kundan boshlanadi'); expect(html).toContain('Sizga −25%');
    expect(html).toMatch(/36 750/); expect(html).toContain('Joriy faningizni uzaytirish');
  });
  it('paket: pastda langar karta va alohida/paket narxi', () => {
    const html = render([product, { ...product, id: 'p2', goal: 'DTM', name: 'DTM' }, bundle]).replace(/<!-- -->/g, '');
    expect(html).toContain('id="bundle-all"'); expect(html).toContain('Alohida olsangiz'); expect(html).toMatch(/98 000 so‘m/);
    expect(html).toContain('Barcha yo‘nalishlar: attestatsiya'); expect(html).toContain('4 300+ ta savol');
    expect(html.indexOf('id="bundle-all"')).toBeGreaterThan(html.indexOf('Attestatsiya'));
  });
  it('mehmon avval kiradi va shu maqsad sahifasiga qaytadi; bot havolasi yo‘q', () => {
    const html = render();
    expect(html.match(/href="\/login\?callbackUrl=%2Fpricing%3Fgoal%3DATTESTATION"/g)).toHaveLength(2);
    expect(html).not.toContain('t.me'); expect(html).toContain('Fanni kirganingizdan keyin shu yerda tanlaysiz');
    expect(render([product], 'ru')).toContain('href="/ru/login?callbackUrl=%2Fru%2Fpricing%3Fgoal%3DATTESTATION"');
  });
  it('kirgan foydalanuvchida tugma POST orqali ishlaydi, fan botda so‘ralmaydi', () => {
    const html = render([product], 'uz', [], undefined, 'u1');
    expect(html.match(/<button type="button"[^>]*>Sotib olish<\/button>/g)).toHaveLength(2);
    expect(html).not.toContain('/login'); expect(html).not.toContain('t.me'); expect(html).not.toContain('Fanni kirganingizdan keyin shu yerda tanlaysiz');
  });
  it('ruscha maqsad havolalari locale bilan chiqadi', () => {
    const html = render([product, { ...product, id: 'dtm', goal: 'DTM', name: 'DTM', subjectRule: 'DTM_BLOCK' }], 'ru', [], 'DTM');
    expect(html).toContain('/ru/pricing?goal=ATTESTATION'); expect(html).toContain('/ru/pricing?goal=DTM');
    expect(html).toContain('aria-current="page"'); expect(html).toContain('2 основных + 3 обязательных предмета');
  });
  it('BUNDLE faqat katalogda bo‘lsa alohida karta; bo‘sh katalog tushunarli', () => {
    expect(render()).not.toContain('id="bundle-');
    const html = render([product, bundle]);
    expect(html).toContain('id="bundle-all"'); expect(html).not.toContain('Alohida olsangiz');
    expect(render([])).toContain('Obuna tez orada');
  });
  it('faol obunalar kartochkada; eski tarif "Eski tarif", Premium/Ustoz emas', () => {
    const endDate = new Date('2026-11-24T19:30:00Z');
    const subscriptions = [
      sub({ id: 'cat', endDate }),
      sub({ id: 'all', plan: 'BUNDLE', goal: null, product: { nameUz: 'Hammasi', nameRu: 'Всё', nameEn: 'All' }, subjects: [], endDate }),
      sub({ id: 'old', plan: 'PREMIUM', productId: null, product: null, subjects: [], endDate }),
      sub({ id: 'teacher', plan: 'TEACHER_PLAN', productId: null, product: null, subjects: [], endDate }),
    ].map(subscriptionView);
    const html = render([product], 'uz', subscriptions);
    expect(html).toContain('Faol obunalaringiz'); expect(html).toContain('Attestatsiya'); expect(html).toContain('Fizika');
    expect(html).toContain('25-noyabrgacha'); expect(html).toContain('Hammasi'); expect(html).toContain('Barcha fanlar');
    expect(html.match(/Eski tarif/g)).toHaveLength(2); expect(html).not.toContain('Premium'); expect(html).not.toContain('Ustoz');
  });
  it.each(['uz', 'ru', 'en'])('%s matnlari to‘liq', (locale) => { expect(render([product], locale)).not.toContain('pricing.'); });
  it('landing faqat matn va locale saqlaydigan havola ko‘rsatadi', () => {
    const html = renderToStaticMarkup(<NextIntlClientProvider locale="ru" messages={ru} timeZone="Asia/Tashkent"><PricingSection /></NextIntlClientProvider>);
    expect(html).toContain('href="/ru/pricing"'); expect(html).not.toContain('49'); expect(html).not.toContain('Premium');
  });
});
