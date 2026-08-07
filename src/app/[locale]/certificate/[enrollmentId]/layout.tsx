import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export async function generateMetadata({ params }: { params: Promise<{ enrollmentId: string }> }): Promise<Metadata> {
  const { enrollmentId } = await params;

  let certificate: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/certificate/${enrollmentId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      certificate = data.certificate;
    }
  } catch {
    // Fallback
  }

  if (!certificate) {
    return {
      title: 'Sertifikat — EduPrime.uz',
      description: "EduPrime.uz'da kursni tugating va sertifikatingizni oling!",
    };
  }

  const userName = certificate.user?.name || 'Foydalanuvchi';
  const courseTitle = certificate.course?.titleUz || 'Kurs';

  const title = `🎓 ${userName} — "${courseTitle}" sertifikati`;
  const description = `${userName} EduPrime.uz'da "${courseTitle}" kursini muvaffaqiyatli tugatdi!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/certificate/${enrollmentId}`,
      type: 'article',
      siteName: 'EduPrime.uz',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function CertificateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
