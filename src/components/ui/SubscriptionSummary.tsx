'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatTashkentDate } from '@/lib/date';
import { subscriptionLabel, type SubscriptionView } from '@/lib/subscription-display';

export default function SubscriptionSummary({ subscriptions, limit, showPeriod = false }: {
  subscriptions: SubscriptionView[]; limit?: number; showPeriod?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('subscriptionUi');
  const visible = limit ? subscriptions.slice(0, limit) : subscriptions;
  return <div className="min-w-0 space-y-2 text-xs">
    <p className="font-semibold">{t('active')}</p>
    {visible.map((s) => <p key={s.id} className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
      <span className="font-medium">{subscriptionLabel(s, locale)}</span>{' — '}
      {showPeriod ? `${formatTashkentDate(s.startDate, locale, true)} — ${formatTashkentDate(s.endDate, locale, true)}`
        : t('until', { date: formatTashkentDate(s.endDate, locale) })}
    </p>)}
    {subscriptions.length > visible.length && <Link href="/pricing" className="inline-flex min-h-11 items-center text-primary-700">
      {t('more', { count: subscriptions.length - visible.length })}
    </Link>}
  </div>;
}
