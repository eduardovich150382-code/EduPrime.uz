import { describe, expect, it } from 'vitest';
import { currentSubscriptions, hasSubscriptionContinuation, nearestExpiringSubscription, subscriptionDisplayName, subscriptionLabel, subscriptionProductStats, subscriptionView } from '../subscription-display';
import { subscriptionAlerts } from '../subscription-alerts';
import { subscriptionFixture as sub, subscriptionNow as now } from './fixtures/subscriptions';

describe('obunani ko‘rsatish va uzaytirish', () => {
  const original = sub({ subjectIds: ['physics', 'math'] });
  const renewal = sub({ id: 's2', subjectIds: ['math', 'physics'], startDate: original.endDate, endDate: new Date('2026-11-26T00:10:00+05:00') });
  it('fanlar tartibi uzaytirishga ta’sir qilmaydi; banner va cron yashiriladi', () => {
    const rows = [original, renewal];
    expect(hasSubscriptionContinuation(original, rows)).toBe(true);
    expect(nearestExpiringSubscription(rows, now)).toBeNull();
    expect(subscriptionAlerts(rows, now)).toEqual([]);
    expect(currentSubscriptions(rows, now).map((s) => s.id)).toEqual(['s1']);
  });
  it.each([
    { productId: 'other' }, { subjectIds: ['physics'] }, { isActive: false }, { userId: 'u2' },
    { startDate: new Date(original.endDate.getTime() + 1) }, { endDate: original.endDate },
  ])('mos kelmagan davomchi eslatmani yashirmaydi: %j', (change) => {
    const rows = [original, { ...renewal, ...change }];
    expect(hasSubscriptionContinuation(original, rows)).toBe(false);
    expect(nearestExpiringSubscription(rows, now)?.id).toBe('s1');
    expect(subscriptionAlerts(rows, now).some((a) => a.subscription.id === 's1')).toBe(true);
  });
  it('uzaytirilgan obunadan keyingi tugayotgan mahsulotni tanlaydi', () => {
    const other = sub({ id: 'other', productId: 'school', endDate: new Date('2026-10-28T18:59:59Z') });
    expect(nearestExpiringSubscription([original, renewal, other], now)).toMatchObject({ id: 'other', daysLeft: 3 });
  });
  it('banner faqat oxirgi 3 kunda: 4 kun — yo‘q, 3 kun — bor', () => {
    const fourDays = sub({ endDate: new Date('2026-10-29T12:00:00+05:00') });
    const threeDays = sub({ endDate: new Date('2026-10-28T12:00:00+05:00') });
    expect(nearestExpiringSubscription([fourDays], now)).toBeNull();
    expect(nearestExpiringSubscription([threeDays], now)?.daysLeft).toBe(3);
  });
  it('foydalanuvchiga eski tarif "Eski tarif", Premium/Ustoz emas', () => {
    for (const plan of ['PREMIUM', 'TEACHER_PLAN'] as const) {
      const view = subscriptionView(sub({ plan, product: null, productId: null, subjects: [] }));
      expect(subscriptionDisplayName(view, 'uz')).toBe('Eski tarif');
      expect(subscriptionLabel(view, 'ru')).toBe('Старый тариф');
      expect(subscriptionLabel(view, 'en')).toBe('Legacy plan');
    }
    expect(subscriptionLabel(subscriptionView(sub()), 'uz')).toBe('Attestatsiya · Fizika');
  });
  it('legacy tarif faqat ayni tarif bilan davom etadi', () => {
    const premium = sub({ plan: 'PREMIUM', product: null, productId: null });
    expect(hasSubscriptionContinuation(premium, [premium, sub({ id: 'next', plan: 'PREMIUM', startDate: premium.endDate, endDate: renewal.endDate })])).toBe(true);
    expect(hasSubscriptionContinuation(premium, [premium, renewal])).toBe(false);
  });
  it('00:30 da soatlar emas Toshkent kunlari hisoblanadi, bugun 0', () => {
    expect(nearestExpiringSubscription([sub()], now)?.daysLeft).toBe(1);
    const today = sub({ endDate: new Date('2026-10-25T23:59:59+05:00') });
    expect(nearestExpiringSubscription([today], now)?.daysLeft).toBe(0);
    expect(subscriptionAlerts([today], now)).toEqual([]);
  });
  it('bir mahsulot bir nechta fan bilan bitta statistik guruhga yig‘iladi; legacy alohida', () => {
    const stats = subscriptionProductStats([sub(), sub({ id: 's2', subjectIds: ['math'] }), sub({ plan: 'BUNDLE', productId: 'all' }), sub({ plan: 'PREMIUM', productId: null })]);
    expect(stats.map((s) => [s.id, s.count])).toEqual([['att', 2], ['all', 1], ['PREMIUM', 1]]);
    expect(subscriptionLabel(subscriptionView(sub()), 'ru')).toBe('Аттестация · Физика');
  });
});
