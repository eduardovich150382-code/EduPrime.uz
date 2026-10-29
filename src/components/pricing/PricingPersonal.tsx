'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { sanitizeReturnPath } from '@/lib/safe-return-path';
import { useViewer } from '@/lib/use-viewer';
import { usePersonalData } from '@/lib/use-personal-data';
import type { PricingProduct } from '@/lib/pricing';
import type { SubscriptionView } from '@/lib/subscription-display';
import { PricingCatalog } from './PricingCatalog';
import { PersonalRefreshContext } from './personal-refresh';

export interface PricingPageData { products: PricingProduct[]; subscriptions: SubscriptionView[] }

// /pricing statik (ISR). `?goal` va `?returnUrl` serverda o'qilmaydi
// (searchParams sahifani dinamik qilardi) — klientda useSearchParams dan.
// Shaxsiy qism (faol obunalar, 2-fan narxi, sotib olish tugmasi) —
// /api/pricing/me dan, faqat kirgan foydalanuvchida.
function PricingBody({ guest, locale, goal, returnUrl }: {
  guest: PricingPageData; locale: string; goal?: string; returnUrl?: string;
}) {
  const t = useTranslations('pricing');
  const viewer = useViewer();
  const { data: session } = useSession();
  const me = usePersonalData<PricingPageData>(`/api/pricing/me?locale=${encodeURIComponent(locale)}`);
  const ready = viewer === 'authed' && me.data !== null;
  const data = ready && me.data ? me.data : guest;
  // So'rov yiqilsa ham tugma ishlasin: sotib olish uchun userId yetarli.
  const userId = viewer === 'authed' && (ready || me.failed) ? session?.user?.id ?? null : null;
  const pending = viewer === 'unknown' ? 'hint' : viewer === 'authed' && !userId;
  return (
    <PersonalRefreshContext.Provider value={me.reload}>
      <PricingCatalog {...data} goal={goal} locale={locale} returnUrl={returnUrl} userId={userId} pending={pending} />
      {returnUrl && <Link href={returnUrl} className="inline-flex min-h-11 items-center text-primary-700">{t('back')}</Link>}
    </PersonalRefreshContext.Provider>
  );
}

function PricingWithQuery({ guest, locale }: { guest: PricingPageData; locale: string }) {
  const query = useSearchParams();
  return <PricingBody guest={guest} locale={locale} goal={query.get('goal') ?? undefined} returnUrl={sanitizeReturnPath(query.get('returnUrl')) ?? undefined} />;
}

// Statik HTML'da Suspense fallback'i — `goal`siz standart mahsulot bilan to'liq
// katalog (bo'sh joy emas). `?goal` boshqa mahsulotni tanlasa, hydration'da
// karta tarmoqsiz almashadi.
export function PricingPersonal({ guest, locale }: { guest: PricingPageData; locale: string }) {
  return (
    <Suspense fallback={<PricingBody guest={guest} locale={locale} />}>
      <PricingWithQuery guest={guest} locale={locale} />
    </Suspense>
  );
}
