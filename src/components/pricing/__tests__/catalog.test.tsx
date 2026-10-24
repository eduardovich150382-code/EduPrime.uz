import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { PricingCatalog } from '../PricingCatalog';
import PricingSection from '@/components/landing/PricingSection';
import type { PricingProduct, PricingSubscription } from '@/lib/pricing';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

const product: PricingProduct = {
  id: 'p', kind: 'CATEGORY', goal: 'ATTESTATION', name: 'Attestatsiya', subjectRule: 'ONE', secondSubjectDiscountPct: 25,
  subjects: [{ id: 'physics', name: 'Fizika', testCount: 12 }], offers: [
    { id: 'o1', label: '1 oy', price: 49000, durationMonths: 1, untilDate: null, buyHref: 'https://t.me/EduPrimeuzbot?start=buy_p_1234567890_abcdef1234' },
    { id: 'o2', label: 'Mavsum', price: 99000, durationMonths: null, untilDate: '2026-11-24T19:30:00Z', buyHref: 'https://t.me/EduPrimeuzbot?start=buy_p_1234567890_abcdef1235' },
  ],
};
function render(products = [product], locale = 'uz', subscriptions: PricingSubscription[] = [], goal?: string) {
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : locale === 'en' ? en : uz} timeZone="Asia/Tashkent" now={new Date('2026-10-24')}>
    <PricingCatalog products={products} subscriptions={subscriptions} locale={locale} goal={goal} />
  </NextIntlClientProvider>);
}
describe('pricing ko‘rinishi', () => {
  it('yagona kategoriyada tanlov yo‘q; fanlar, ikki variant va chegirma chiqadi', () => {
    const html = render();
    expect(html).not.toContain('<nav'); expect(html).toContain('12 ta test'); expect(html).toContain('Ikkinchi fan — 25% chegirma');
    expect(html).toContain('25-noyabr'); expect(html.match(/>Sotib olish</g)).toHaveLength(2);
    expect(html).toContain(product.offers[0].buyHref); expect(html).not.toContain('<select'); expect(html).not.toContain('Faol obunalaringiz');
  });
  it('ruscha maqsad havolalari locale bilan chiqadi', () => {
    const html = render([product, { ...product, id: 'dtm', goal: 'DTM', name: 'DTM', subjectRule: 'DTM_BLOCK' }], 'ru', [], 'DTM');
    expect(html).toContain('/ru/pricing?goal=ATTESTATION'); expect(html).toContain('/ru/pricing?goal=DTM');
    expect(html).toContain('aria-current="page"'); expect(html).toContain('2 основных предмета');
  });
  it('BUNDLE faqat katalogda bo‘lsa alohida karta; bo‘sh katalog tushunarli', () => {
    expect(render()).not.toContain('id="bundle-');
    expect(render([product, { ...product, id: 'all', kind: 'BUNDLE', goal: null, name: 'Hammasi', subjectRule: 'NONE' }])).toContain('id="bundle-all"');
    expect(render([])).toContain('Obuna tez orada');
  });
  it('yangi obuna mahsulot/fan bilan, eski obunalar eski nomlari bilan chiqadi', () => {
    const subscriptions = ['CATEGORY', 'BUNDLE', 'PREMIUM', 'TEACHER_PLAN'].map((plan) => ({ id: plan, plan, name: plan === 'BUNDLE' ? 'Hammasi' : 'Attestatsiya', subjects: plan === 'CATEGORY' ? ['Fizika'] : [], endDate: '2026-11-24T19:30:00Z' }));
    const html = render([product], 'uz', subscriptions);
    expect(html).toContain('Attestatsiya · Fizika — 25-noyabr, 2026gacha');
    expect(html).toContain('Hammasi —'); expect(html).toContain('Premium —'); expect(html).toContain('Ustoz —');
  });
  it.each(['uz', 'ru', 'en'])('%s matnlari to‘liq', (locale) => { expect(render([product], locale)).not.toContain('pricing.'); });
  it('landing faqat matn va locale saqlaydigan havola ko‘rsatadi', () => {
    const html = renderToStaticMarkup(<NextIntlClientProvider locale="ru" messages={ru} timeZone="Asia/Tashkent"><PricingSection /></NextIntlClientProvider>);
    expect(html).toContain('href="/ru/pricing"'); expect(html).not.toContain('49'); expect(html).not.toContain('Premium');
  });
});
