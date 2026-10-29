import { setRequestLocale } from 'next-intl/server';
import { TestsPage } from '@/components/tests/TestsPageContent';
import { testsMetadata } from '@/components/tests/tests-metadata';
import { loadInitialTests } from '@/lib/public-tests';
import { getPublicSettings } from '@/lib/public-catalog';
import { noBuildTimeParams } from '@/i18n/static-params';

export const metadata = testsMetadata;

// Statik (ISR): filtrsiz birinchi sahifa va attestatsiya sanasi keshlangan
// funksiyalardan, CDN'dan beriladi. `searchParams` ataylab o'qilmaydi — u
// sahifani har so'rovda dinamik render qilardi; filtrlash klientda
// (URL → /api/tests). Shaxsiy qismlar (natijalar, "Davom etish", hasAccess)
// sessiya aniq bo'lgach klientda. Yechish (/tests/[id]/solve) va natijalar
// (main) da qoladi.
export const revalidate = 300;
// Build'da bazaga ulanmaydi — birinchi so'rovda render (i18n/static-params.ts).
export const generateStaticParams = noBuildTimeParams;

export default async function PublicTestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [initial, settings] = await Promise.all([loadInitialTests(), getPublicSettings()]);
  return <TestsPage initial={initial} attestationDate={settings.attestation_date || null} />;
}
