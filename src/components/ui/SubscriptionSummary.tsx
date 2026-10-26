'use client';

import { useLocale, useNow, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { daysLeft, formatTashkentDate } from '@/lib/date';
import { localizedName } from '@/lib/pricing';
import type { SubscriptionView } from '@/lib/subscription-display';

// Admin foydalanuvchi kartasi uchun matnli ro'yxat. Foydalanuvchi sahifalari
// ActiveSubscriptionCard'dan foydalanadi; bu yerda eski tarifning aniq nomi
// ("Premium"/"Ustoz") saqlanadi — admin qaysi reja ekanini ko'rishi kerak.
export default function SubscriptionSummary({ subscriptions, limit, showPeriod = false }: {
  subscriptions: SubscriptionView[]; limit?: number; showPeriod?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('subscriptionUi');
  const now = useNow();
  const visible = limit ? subscriptions.slice(0, limit) : subscriptions;
  return <div className="min-w-0 space-y-2 text-xs">
    <p className="font-semibold">{t('active')}</p>
    {visible.map((s) => {
      const label = [s.name, ...s.subjects].map((name) => localizedName(name, locale)).join(' · ');
      const days = Math.max(daysLeft(s.endDate, now), 0);
      return <p key={s.id} className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
        <span className="font-medium">{label}</span>{' — '}
        {showPeriod ? `${formatTashkentDate(s.startDate, locale, true)} — ${formatTashkentDate(s.endDate, locale, true)}`
          : t('until', { date: formatTashkentDate(s.endDate, locale) })}
        {` (${t('daysShort', { count: days })})`}
      </p>;
    })}
    {subscriptions.length > visible.length && <Link href="/pricing" className="inline-flex min-h-11 items-center text-primary-700">
      {t('more', { count: subscriptions.length - visible.length })}
    </Link>}
  </div>;
}
