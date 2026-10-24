import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import SubscriptionSummary from '../SubscriptionSummary';
import { SubscriptionExpiry, SubscriptionOffer } from '../SubscriptionBanners';
import { subscriptionView, type SubscriptionStatus } from '@/lib/subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

function render(child: React.ReactNode, locale = 'uz') {
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : locale === 'en' ? en : uz} timeZone="Asia/Tashkent" now={now}>{child}</NextIntlClientProvider>);
}
const status: SubscriptionStatus = { plan: 'CATEGORY', hasPremium: false, hasTeacher: false, hasAnyScope: true,
  subscriptions: [subscriptionView(sub())], daysUntilExpiry: 1, expiringSubscription: null };

describe('obuna ko‘rinishi', () => {
  it.each(['uz', 'ru', 'en'])('%s: mahsulot/fan/sana va mos pricing havolasi, to‘liq tarjima', (locale) => {
    const html = render(<SubscriptionExpiry subscription={{ ...subscriptionView(sub()), daysLeft: 1 }} close={() => {}} />, locale);
    expect(html).toContain(locale === 'uz' ? 'Attestatsiya · Fizika' : locale === 'ru' ? 'Аттестация · Физика' : 'Attestation · Physics');
    expect(html).toContain(`${locale === 'uz' ? '' : `/${locale}`}/pricing?goal=ATTESTATION`); expect(html).not.toContain('subscriptionUi.');
    expect(html).toContain('min-h-11'); expect(html).toContain('flex-wrap'); expect(html).toContain('overflow-wrap:anywhere');
  });
  it('obuna yoki ruxsat bor foydalanuvchiga taklif yo‘q, yuklanish ham yashirin', () => {
    for (const value of [null, status, { ...status, plan: 'FREE', subscriptions: [] }, { ...status, plan: 'PREMIUM', hasAnyScope: false }]) {
      expect(render(<SubscriptionOffer status={value} close={() => {}} />)).toBe('');
    }
    const html = render(<SubscriptionOffer status={{ ...status, plan: 'FREE', subscriptions: [], hasAnyScope: false }} close={() => {}} />);
    expect(html).toContain('Obuna olish'); expect(html).not.toContain('Premium'); expect(html).toContain('href="/pricing"');
  });
  it('Sidebar: 3 ta obuna + yana N; uzoq nomlar kesilmaydi', () => {
    const subscriptions = Array.from({ length: 5 }, (_, i) => subscriptionView(sub({ id: `s${i}` })));
    const html = render(<SubscriptionSummary subscriptions={subscriptions} limit={3} />);
    expect(html.match(/Attestatsiya · Fizika/g)).toHaveLength(3);
    expect(html).toContain('yana 2 ta'); expect(html).toContain('26-oktabrgacha');
    expect(html).not.toContain('truncate'); expect(html).toContain('overflow-wrap:anywhere');
  });
  it('admin muddati boshlanishi va tugashi bilan; legacy nomi saqlanadi', () => {
    const html = render(<SubscriptionSummary subscriptions={[subscriptionView(sub({ plan: 'TEACHER_PLAN', productId: null, product: null, subjects: [] }))]} showPeriod />);
    expect(html).toContain('Ustoz'); expect(html).toContain('1-oktabr'); expect(html).toContain('26-oktabr');
  });
  it('davom etadigan obuna uchun banner yo‘q; BUNDLE umumiy pricingga olib boradi', () => {
    expect(render(<SubscriptionExpiry subscription={null} close={() => {}} />)).toBe('');
    const html = render(<SubscriptionExpiry subscription={{ ...subscriptionView(sub({ plan: 'BUNDLE', goal: null })), daysLeft: 0 }} close={() => {}} />);
    expect(html).toContain('href="/pricing"'); expect(html).not.toContain('?goal='); expect(html).toContain('bugun');
  });
});
