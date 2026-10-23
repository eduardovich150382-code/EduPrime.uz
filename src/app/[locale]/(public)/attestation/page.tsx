import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { loadAttestationPage } from '@/lib/attestation-page';
import { loginHref } from '@/lib/safe-return-path';
import { AttestationHero } from '@/components/attestation/AttestationHero';
import { ExamStructure } from '@/components/attestation/ExamStructure';
import { MockList } from '@/components/attestation/MockList';
import { GuestPanel, ReadinessPanel } from '@/components/attestation/ReadinessPanel';

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
  const data = await loadAttestationPage(user, locale);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <AttestationHero next={data.next} date={data.settings.date} locale={locale} />
      <ExamStructure settings={data.settings} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <MockList rows={data.rows} />
        {data.readiness ? (
          <ReadinessPanel readiness={data.readiness} />
        ) : (
          <GuestPanel loginHref={loginHref(locale === 'uz' ? '/attestation' : `/${locale}/attestation`)} />
        )}
      </div>
    </div>
  );
}
