import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import ActiveSubscriptionCard from '../ActiveSubscriptionCard';
import { subscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';

// subscriptionNow — Toshkentda 25-oktabr 00:30.
const ends = { 16: '2026-11-10T12:00:00+05:00', 5: '2026-10-30T12:00:00+05:00', 2: '2026-10-27T12:00:00+05:00', expired: '2026-10-24T12:00:00+05:00' };
function render(endDate: string, variant: 'full' | 'compact' = 'full', overrides = {}, locale = 'uz') {
  const s = subscriptionView(sub({ endDate: new Date(endDate), ...overrides }));
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : uz} timeZone="Asia/Tashkent" now={now}>
    <ActiveSubscriptionCard subscription={s} variant={variant} />
  </NextIntlClientProvider>);
}

describe('ActiveSubscriptionCard', () => {
  it('16 kun: kategoriya rangida, fan, sana, yashil pill; tugma yo‘q', () => {
    const html = render(ends[16]);
    expect(html).toContain('Attestatsiya'); expect(html).toContain('Fizika'); expect(html).toContain('10-noyabrgacha');
    expect(html).toContain('16 kun qoldi'); expect(html).toContain('border-color:#92400e');
    expect(html).toContain('color:#166534'); expect(html).not.toContain('Uzaytirish'); expect(html).not.toContain('Premium');
    expect(html).toContain('role="progressbar"');
  });
  it('5 kun — ko‘k, tugma yo‘q; 2 kun — to‘q sariq va "Uzaytirish" /pricing?goal ga', () => {
    const five = render(ends[5]);
    expect(five).toContain('5 kun qoldi'); expect(five).toContain('color:#1e40af'); expect(five).not.toContain('Uzaytirish');
    const two = render(ends[2]);
    expect(two).toContain('2 kun qoldi'); expect(two).toContain('color:#9a3412');
    expect(two).toContain('Uzaytirish'); expect(two).toContain('href="/pricing?goal=ATTESTATION"'); expect(two).toContain('min-h-11');
  });
  it('tugagan — qizil "Tugagan" va "Qayta olish"', () => {
    const html = render(ends.expired);
    expect(html).toContain('Tugagan'); expect(html).toContain('color:#991b1b'); expect(html).toContain('Qayta olish');
  });
  it('compact: bitta qator "Attestatsiya · Fizika — 10-noyabrgacha (16 kun)" + Uzaytirish', () => {
    const html = render(ends[16], 'compact').replace(/<!-- -->/g, '');
    expect(html).toContain('Attestatsiya</span> · Fizika — ');
    expect(html).toContain('10-noyabrgacha (16 kun)'); expect(html).toContain('Uzaytirish');
  });
  it('BUNDLE — oltin uslub va "Barcha fanlar"; eski tarif — kulrang "Eski tarif"', () => {
    const bundle = render(ends[2], 'full', { plan: 'BUNDLE', goal: null, subjects: [], product: { nameUz: 'Hammasi', nameRu: 'Всё', nameEn: 'All' } });
    expect(bundle).toContain('border-color:#d97706'); expect(bundle).toContain('Barcha fanlar'); expect(bundle).toContain('href="/pricing"');
    const legacy = render(ends[16], 'full', { plan: 'PREMIUM', goal: null, subjects: [], product: null, productId: null });
    expect(legacy).toContain('Eski tarif'); expect(legacy).toContain('border-color:#9ca3af');
    expect(legacy).not.toContain('Premium'); expect(legacy).not.toContain('Barcha fanlar');
  });
  it('ruscha ko‘plik shakllari', () => {
    expect(render(ends[2], 'full', {}, 'ru')).toContain('осталось 2 дня');
    expect(render(ends[16], 'compact', {}, 'ru').replace(/<!-- -->/g, '')).toContain('(16 дней)');
  });
});
