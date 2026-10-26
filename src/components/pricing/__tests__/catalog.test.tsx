import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { PricingCatalog } from '../PricingCatalog';
import PricingSection from '@/components/landing/PricingSection';
import type { PricingProduct } from '@/lib/pricing';
import { subscriptionView, type SubscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub } from '@/lib/__tests__/fixtures/subscriptions';
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
function render(products = [product], locale = 'uz', subscriptions: SubscriptionView[] = [], goal?: string) {
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
