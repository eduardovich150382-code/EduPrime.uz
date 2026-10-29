import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadAttestationPage, type AttestationPersonalData } from '@/lib/attestation-page';
import { loadPricingPage } from '@/lib/pricing-page';
import { buildAttestationView } from '@/lib/attestation-offer';
import { loginHref, localizedPath } from '@/lib/safe-return-path';
import { AttestationHero } from '@/components/attestation/AttestationHero';
import { ExamStructure } from '@/components/attestation/ExamStructure';
import {
  AttestationPersonalProvider, HeroActions, OfferSlot, RowsSlot, SidePanelSlot,
} from '@/components/attestation/AttestationPersonal';
import { noBuildTimeParams } from '@/i18n/static-params';

// Statik (ISR): sahifa mehmon ko'rinishida CDN'dan beriladi, shaxsiy qism
// (natija, readiness, obuna, shaxsiy narx) klientda /api/attestation/me dan.
// Katalog, narx va sozlamalar keshlangan funksiyalardan (lib/public-catalog.ts);
// admin o'zgartirsa revalidateTag sahifani ham yangilaydi, aks holda ko'pi
// bilan 5 daqiqa (PUBLIC_CACHE_REVALIDATE_SEC bilan bir xil).
export const revalidate = 300;
// Build'da bazaga ulanmaydi — birinchi so'rovda render (i18n/static-params.ts).
export const generateStaticParams = noBuildTimeParams;
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
  setRequestLocale(locale);
  // Narx, variantlar va obunalar /pricing yuklovchisidan — alohida narx manbai yo'q.
  const [data, pricing] = await Promise.all([loadAttestationPage(null, locale), loadPricingPage(null, locale)]);
  const t = await getTranslations({ locale, namespace: 'attestation.list' });

  const returnHere = loginHref(localizedPath('/attestation', locale));
  const guest: AttestationPersonalData = {
    mockRows: data.mockRows,
    topicRows: data.topicRows,
    hero: data.hero,
    readiness: null,
    view: buildAttestationView(pricing, { userId: null, loginHref: returnHere }, new Date()),
  };

  return (
    <AttestationPersonalProvider locale={locale} guest={guest}>
      {/* gap, space-y emas: HintSwitch o'ramalari `display: contents` — margin ularga tushmaydi. */}
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <AttestationHero date={data.settings.date} locale={locale} actions={<HeroActions />} />
        <OfferSlot />
        <ExamStructure settings={data.settings} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-8">
            <RowsSlot kind="mock" title={t('title')} emptyText={t('mocksEmpty')} footnote={t('mocksFootnote')} />
            <RowsSlot kind="topic" title={t('topicsTitle')} emptyText={t('mocksEmpty')} />
          </div>
          <SidePanelSlot loginHref={returnHere} />
        </div>
      </div>
    </AttestationPersonalProvider>
  );
}
