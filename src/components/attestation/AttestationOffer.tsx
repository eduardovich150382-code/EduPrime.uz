import { useNow, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { liveOffers, recommendedOfferId } from '@/lib/attestation-offer';
import { soldSubjects, type PricingProduct, type PricingSubject } from '@/lib/pricing';
import type { SubscriptionView } from '@/lib/subscription-display';
import { OfferCard } from '@/components/pricing/OfferCard';
import type { BuyContext } from '@/components/pricing/OfferVariant';
import ActiveSubscriptionCard from '@/components/subscription/ActiveSubscriptionCard';

// Obuna kartasi /pricing'dagi OfferCard'ning o'zi — narx, muddat, afzalliklar
// va "Sotib olish" (mehmonda kirish, kirganda sayt checkout'i) bitta joyda.
// Bu yerda faqat sarlavha va tavsiya etilgan variant beriladi.
export function AttestationOffer({ product, buy, locale }: { product: PricingProduct; buy: BuyContext; locale: string }) {
  const t = useTranslations('attestation.offer');
  const now = useNow();
  const offers = liveOffers(product.offers, now);
  const sold = soldSubjects(product);
  return (
    <OfferCard product={{ ...product, offers }} locale={locale} buy={buy}
      title={sold.length === 1 ? t('titleSubject', { subject: sold[0].name }) : t('title')}
      recommend={{ offerId: recommendedOfferId(offers, now), label: t('recommended') }} />
  );
}

// Obunachiga sotib olish kartasi o'rniga past bo'yli blok. Muddat va ≤3 kunda
// "Uzaytirish" — ActiveSubscriptionCard'ning ixcham ko'rinishida (header
// popover'i bilan bir qoida).
export function AttestationActiveSubscription({ subscription, uncoveredSubjects, discountPct }: {
  subscription: SubscriptionView; uncoveredSubjects: PricingSubject[]; discountPct: number;
}) {
  const t = useTranslations('attestation.offer');
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <p className="flex shrink-0 items-center gap-1.5 font-semibold text-[#166534]">
        <CheckCircle2 size={18} aria-hidden className="shrink-0" />{t('activeTitle')}
      </p>
      <ul className="min-w-0 flex-1">
        <ActiveSubscriptionCard subscription={subscription} variant="compact" />
      </ul>
      {uncoveredSubjects.length > 0 && (
        <Link href="/pricing?goal=ATTESTATION" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline">
          {t('otherSubject')}
          {discountPct > 0 && (
            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-bold text-[#166534]">{t('otherSubjectDiscount', { percent: discountPct })}</span>
          )}
        </Link>
      )}
    </div>
  );
}
