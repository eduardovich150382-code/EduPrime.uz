import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { loadAttestationPage } from '@/lib/attestation-page';
import { loadPricingPage } from '@/lib/pricing-page';
import { attestationSubscription, pickAttestationProduct } from '@/lib/attestation-offer';
import { loginHref, localizedPath } from '@/lib/safe-return-path';
import { AttestationHero } from '@/components/attestation/AttestationHero';
import { AttestationActiveSubscription, AttestationOffer } from '@/components/attestation/AttestationOffer';
import { ExamStructure } from '@/components/attestation/ExamStructure';
import { TestRowList } from '@/components/attestation/TestRowList';
import { GuestPanel, ReadinessPanel } from '@/components/attestation/ReadinessPanel';

// Admin narxni o'zgartirgach obuna kartasida eski Full Route Cache qaytmasin (/pricing kabi).
export const dynamic = 'force-dynamic';
type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'attestation.meta' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { title: t('title'), description: t('description') },
  };
}

export default async function AttestationPage({ params }: { params: Params }) {
  const { locale } = await params;
  const session = await auth();
  const user = session?.user?.id ? { id: session.user.id, role: session.user.role } : null;
  // Narx, variantlar va obunalar /pricing yuklovchisidan — alohida narx manbai yo'q.
  const [data, pricing] = await Promise.all([loadAttestationPage(user, locale), loadPricingPage(user?.id ?? null, locale)]);
  const t = await getTranslations({ locale, namespace: 'attestation.list' });

  const now = new Date();
  const product = pickAttestationProduct(pricing.products);
  const owned = product ? attestationSubscription(pricing.subscriptions, product, now) : null;
  const showOffer = !!product && !owned && product.offers.length > 0;
  const returnHere = loginHref(localizedPath('/attestation', locale));
  const buy = { userId: user?.id ?? null, loginHref: returnHere, knownSubscriptionIds: pricing.subscriptions.map((s) => s.id) };
  const lockedHref = showOffer ? '#obuna' : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <AttestationHero hero={data.hero} date={data.settings.date} locale={locale} offersAnchor={showOffer} />
      {(showOffer || owned) && (
        <section id="obuna" className="scroll-mt-24">
          {owned ? (
            <AttestationActiveSubscription subscription={owned.subscription} uncoveredSubjects={owned.uncoveredSubjects}
              discountPct={product?.secondSubjectDiscountPct ?? 0} />
          ) : product && <AttestationOffer product={product} buy={buy} locale={locale} />}
        </section>
      )}
      <ExamStructure settings={data.settings} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <TestRowList title={t('title')} rows={data.mockRows} emptyText={t('mocksEmpty')} lockedHref={lockedHref} />
            {data.mockRows.length > 0 && <p className="text-sm text-text-secondary">{t('mocksFootnote')}</p>}
          </div>
          {data.topicRows.length > 0 && (
            <TestRowList title={t('topicsTitle')} rows={data.topicRows} emptyText={t('mocksEmpty')} lockedHref={lockedHref} />
          )}
        </div>
        {data.readiness ? (
          <ReadinessPanel readiness={data.readiness} />
        ) : (
          <GuestPanel loginHref={returnHere} />
        )}
      </div>
    </div>
  );
}
