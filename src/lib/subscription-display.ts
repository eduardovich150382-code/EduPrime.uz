import type { SubscriptionDetails, LocalizedName } from './subscription-details';
import { daysUntil, tashkentDateKey } from './date';
import { sameSubjectIds } from './product-offers';
import { localizedName } from './pricing';
import { subscriptionMessages } from './subscription-messages';

export type SubscriptionView = Omit<SubscriptionDetails, 'startDate' | 'endDate'> & {
  startDate: string; endDate: string; name: LocalizedName; isLegacy: boolean;
};
export interface SubscriptionStatus {
  plan: string; subscriptions: SubscriptionView[]; hasPremium: boolean; hasTeacher: boolean;
  hasAnyScope: boolean; daysUntilExpiry: number | null;
  expiringSubscription: (SubscriptionView & { daysLeft: number }) | null;
}

export function subscriptionName(s: Pick<SubscriptionDetails, 'plan' | 'product'>): LocalizedName {
  if (s.product && s.plan !== 'PREMIUM' && s.plan !== 'TEACHER_PLAN') return s.product;
  const key = s.plan === 'PREMIUM' ? 'legacyPremium' : s.plan === 'TEACHER_PLAN' ? 'legacyTeacher' : 'subscription';
  return { nameUz: subscriptionMessages('uz')[key], nameRu: subscriptionMessages('ru')[key], nameEn: subscriptionMessages('en')[key] };
}

export function subscriptionView(s: SubscriptionDetails): SubscriptionView {
  return { ...s, startDate: s.startDate.toISOString(), endDate: s.endDate.toISOString(),
    name: subscriptionName(s), isLegacy: s.plan === 'PREMIUM' || s.plan === 'TEACHER_PLAN' };
}

export function currentSubscriptions(rows: readonly SubscriptionDetails[], now: Date): SubscriptionDetails[] {
  return rows.filter((s) => s.isActive && s.startDate <= now && s.endDate >= now)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime() || a.id.localeCompare(b.id));
}

// Nomlar o'zgarishi mumkin; uzaytirish mahsulot va fanlarning ID'lari bilan
// tekshiriladi. Boshqa foydalanuvchining obunasi davomchi bo'la olmaydi.
export function hasSubscriptionContinuation(s: SubscriptionDetails, rows: readonly SubscriptionDetails[]): boolean {
  return rows.some((next) => next.id !== s.id && next.userId === s.userId && next.isActive
    && next.endDate > s.endDate && next.startDate <= s.endDate
    && (s.plan === 'PREMIUM' || s.plan === 'TEACHER_PLAN'
      ? next.plan === s.plan
      : !!s.productId && next.productId === s.productId && sameSubjectIds([...s.subjectIds], [...next.subjectIds])));
}

export function nearestExpiringSubscription(rows: readonly SubscriptionDetails[], now: Date) {
  const s = currentSubscriptions(rows, now).find((row) => !hasSubscriptionContinuation(row, rows));
  if (!s) return null;
  const daysLeft = daysUntil(tashkentDateKey(s.endDate), now);
  // Banner faqat oxirgi 3 kunda va tugash kunida — undan oldin header
  // belgisi kun sonini ko'rsatib turadi, banner sahifani band qilmasin.
  return daysLeft !== null && daysLeft <= 3 ? { ...subscriptionView(s), daysLeft } : null;
}

// Foydalanuvchiga eski PREMIUM/TEACHER_PLAN "Eski tarif" bo'lib ko'rinadi —
// "Premium" endi sotilmaydi. Admin ro'yxatlari aniq rejani `subscriptionName`
// orqali ko'rsatishda davom etadi.
export function subscriptionDisplayName(s: Pick<SubscriptionView, 'name' | 'isLegacy'>, locale: string): string {
  return s.isLegacy ? subscriptionMessages(locale).legacyPlan : localizedName(s.name, locale);
}

export function subscriptionLabel(s: Pick<SubscriptionView, 'name' | 'subjects' | 'isLegacy'>, locale: string): string {
  const subjects = s.subjects.map((subject) => localizedName(subject, locale));
  return [subscriptionDisplayName(s, locale), ...subjects].join(' · ');
}

export function subscriptionPricingHref(s: { goal: SubscriptionDetails['goal']; plan: string }): string {
  return s.goal ? `/pricing?goal=${s.goal}` : s.plan === 'TEACHER_PLAN' ? '/pricing?goal=ATTESTATION' : '/pricing';
}

export function subscriptionProductStats(rows: readonly SubscriptionDetails[]) {
  const groups = new Map<string, { id: string; name: LocalizedName; count: number }>();
  for (const row of rows) {
    const id = row.productId ?? row.plan;
    const group = groups.get(id) ?? { id, name: subscriptionName(row), count: 0 };
    group.count++;
    groups.set(id, group);
  }
  return [...groups.values()];
}
