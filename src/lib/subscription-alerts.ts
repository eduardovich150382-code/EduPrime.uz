import { createTranslator } from 'next-intl';
import type { SubscriptionDetails } from './subscription-details';
import { hasSubscriptionContinuation, subscriptionLabel, subscriptionPricingHref, subscriptionView } from './subscription-display';
import { daysUntil, formatTashkentDate, tashkentDateKey } from './date';
import { subscriptionMessages } from './subscription-messages';

export interface SubscriptionAlert { subscription: SubscriptionDetails; days: number | null }

export function subscriptionAlerts(rows: readonly SubscriptionDetails[], now: Date): SubscriptionAlert[] {
  return rows.filter((s) => s.isActive && s.startDate <= now && !hasSubscriptionContinuation(s, rows))
    .map((subscription) => ({ subscription, days: subscription.endDate < now ? null : daysUntil(tashkentDateKey(subscription.endDate), now) }))
    .filter((alert) => alert.days === null || [7, 3, 1].includes(alert.days))
    .sort((a, b) => a.subscription.endDate.getTime() - b.subscription.endDate.getTime() || a.subscription.id.localeCompare(b.subscription.id));
}

export function subscriptionAlertMessage(alerts: SubscriptionAlert[], lang: string) {
  const locale = lang === 'ru' || lang === 'en' ? lang : 'uz';
  const t = createTranslator({ locale, messages: subscriptionMessages(locale) });
  const link = alerts.length === 1 ? subscriptionPricingHref(alerts[0].subscription) : '/pricing';
  const message = alerts.map(({ subscription, days }) => t(days === null ? 'expired' : 'expires', {
    subscription: subscriptionLabel(subscriptionView(subscription), locale), days: days ?? 0,
    date: formatTashkentDate(subscription.endDate, locale, true),
  })).join('\n');
  return { title: t('alertTitle'), message, link, telegram: `${message}\n\n${t('cronRenew', { url: `https://eduprime.uz/${locale}${link}` })}` };
}
