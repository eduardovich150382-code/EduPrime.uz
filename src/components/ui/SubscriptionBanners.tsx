'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ArrowRight, Clock, Sparkles, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatTashkentDate } from '@/lib/date';
import { subscriptionLabel, subscriptionPricingHref, type SubscriptionStatus } from '@/lib/subscription-display';

function Banner({ children, href, action, close, urgency }: {
  children: React.ReactNode; href: string; action: string; close: () => void; urgency?: number;
}) {
  const t = useTranslations('subscriptionUi');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Mobil matn bir necha qatorga o'ralganda sahifa banner ostida qolmasin.
    const update = () => document.documentElement.style.setProperty('--subscription-banner-height', `${element.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--subscription-banner-height'); };
  }, []);
  const color = urgency === undefined ? 'from-primary-600 to-purple-600' : urgency <= 1 ? 'from-red-500 to-red-600'
    : urgency <= 3 ? 'from-orange-500 to-orange-600' : 'from-yellow-500 to-yellow-600';
  const Icon = urgency === undefined ? Sparkles : Clock;
  return <div ref={ref} data-subscription-banner className={`fixed top-16 left-0 right-0 bg-gradient-to-r ${color} text-white z-40`}>
    <div className="md:ml-64 flex flex-col flex-wrap items-stretch gap-x-2 gap-y-1 px-4 py-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Icon size={16} className="shrink-0" />
        <p className="min-w-0 text-xs font-medium whitespace-normal break-words [overflow-wrap:anywhere] sm:text-sm">{children}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-white/20 px-3 text-xs font-semibold hover:bg-white/30">
          {action}<ArrowRight size={12} />
        </Link>
        <button type="button" onClick={close} aria-label={t('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-white/20"><X size={16} /></button>
      </div>
    </div>
  </div>;
}

export function SubscriptionOffer({ status, close }: { status: SubscriptionStatus | null; close: () => void }) {
  const t = useTranslations('subscriptionUi');
  if (!status || status.hasAnyScope || status.subscriptions.length) return null;
  return <Banner href="/pricing" action={t('subscribe')} close={close}>{t('offer')}</Banner>;
}

export function SubscriptionExpiry({ subscription, close }: { subscription: SubscriptionStatus['expiringSubscription']; close: () => void }) {
  const locale = useLocale();
  const t = useTranslations('subscriptionUi');
  if (!subscription) return null;
  return <Banner href={subscriptionPricingHref(subscription)} action={t('renew')} close={close} urgency={subscription.daysLeft}>
    {t(subscription.daysLeft === 0 ? 'expiresToday' : 'expires', {
      subscription: subscriptionLabel(subscription, locale), date: formatTashkentDate(subscription.endDate, locale, true), days: subscription.daysLeft,
    })}
  </Banner>;
}
