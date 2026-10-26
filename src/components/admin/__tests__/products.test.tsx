import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import ProductEditor from '../ProductEditor';
import TestAccessFields from '@/components/teacher/TestAccessFields';
import type { AdminProduct } from '../product-types';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

function render(child: React.ReactNode, locale = 'uz') {
  const translations = locale === 'ru' ? ru : locale === 'en' ? en : uz;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} timeZone="Asia/Tashkent" now={new Date('2026-10-23')}
      messages={{ adminProducts: translations.adminProducts, testAccessForm: translations.testAccessForm }}>
      {child}
    </NextIntlClientProvider>,
  );
}
const product: AdminProduct = {
  id: 'obuna-attestation', nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation', kind: 'CATEGORY', categoryId: 'att', subjectRule: 'ONE',
  isOnSale: true, secondSubjectDiscountPct: 10, order: 0, publishedTestCount: 4,
  taglineUz: 'Attestatsiyaga ishonch bilan', taglineRu: null, taglineEn: null, featuresUz: ['Telegram guruh', 'Haftalik jonli tahlil'], featuresRu: [], featuresEn: [],
  subjects: [{ id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', isMandatory: false, publishedTestCount: 4 }, { id: 'math', nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Maths', isMandatory: false, publishedTestCount: 0 }],
  offers: [{ id: 'o1', labelUz: '1 oy', labelRu: '1 месяц', labelEn: '1 month', durationMonths: 1, untilDate: null, price: 0, isActive: true, order: 0,
    compareAtPrice: 70000, badgeUz: 'Eng foydali', badgeRu: null, badgeEn: null, isFeatured: true, promoUntil: '2026-11-01T13:30:00.000Z' }],
};

describe('marketing maydonlari', () => {
  it('shior, afzalliklar (har qatorda bittadan), eski narx, belgi, ajratish va aksiya Toshkent vaqtida', () => {
    const html = render(React.createElement(ProductEditor, { product, onSaved: async () => {} }));
    expect(html).toContain('value="Attestatsiyaga ishonch bilan"'); expect(html).toContain('Telegram guruh\nHaftalik jonli tahlil');
    expect(html).toContain(uz.adminProducts.compareAtPrice); expect(html).toContain('value="70000"');
    expect(html).toContain('value="Eng foydali"'); expect(html).toContain('type="datetime-local"');
    // 13:30 UTC = 18:30 Toshkent.
    expect(html).toContain('value="2026-11-01T18:30"');
  });
});

describe('sotuv ogohlantirishlari', () => {
  it('0 narx va bo‘sh fan aniq ko‘rsatiladi, saqlash ochiq qoladi', () => {
    const html = render(React.createElement(ProductEditor, { product, onSaved: async () => {} }));
    expect(html).toContain('Narxi 0 so&#x27;m bo&#x27;lgan variant bor — obuna bepul sotiladi');
    expect(html).toContain('Matematika: 0');
    expect(html).toContain(uz.adminProducts.emptyContentWarning);
    expect(html).not.toContain('<fieldset disabled');
  });
  it('nofaol 0 narxli variant bepul sotuv ogohlantirishini bermaydi', () => {
    const p = { ...product, offers: [{ ...product.offers[0], isActive: false }] };
    const html = render(React.createElement(ProductEditor, { product: p, onSaved: async () => {} }));
    expect(html).not.toContain('obuna bepul sotiladi');
    expect(html).toContain(uz.adminProducts.noActiveOffersWarning);
  });
  it('uchta faol variant faqat ogohlantiriladi', () => {
    const p = { ...product, offers: [0, 1, 2].map((n) => ({ ...product.offers[0], id: `o${n}`, price: 5000 })) };
    const html = render(React.createElement(ProductEditor, { product: p, onSaved: async () => {} }));
    expect(html).toContain(uz.adminProducts.tooManyOffers);
    expect(html).not.toContain('<fieldset disabled');
  });
});

describe('uch tilli kirish formasi', () => {
  it.each(['uz', 'ru', 'en'])('%s uchta tanlov, eski qiymatni yozmasdan ko‘rsatadi', (locale) => {
    const onChange = vi.fn();
    const html = render(React.createElement(TestAccessFields, { value: 'teacher', price: 0, onChange }), locale);
    expect((html.match(/aria-pressed=/g) ?? []).length).toBe(3);
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    expect(html).not.toContain('Premium');
    expect(onChange).not.toHaveBeenCalled();
  });
});
