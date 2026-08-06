import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  let test: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/tests/${id}/preview`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      test = data.test;
    }
  } catch {
    // Fallback
  }

  if (!test) {
    return {
      title: 'Test sinovi — EduPrime.uz',
      description: "EduPrime.uz da testlarni bepul sinab ko'ring — DTM, maktab, attestatsiya, SAT, GRE.",
    };
  }

  const title = `${test.titleUz} — bepul namuna`;
  const description = `"${test.titleUz}" (${test.subject?.nameUz}) testidan ${'3'} ta savolni bepul sinab ko'ring. To'liq test EduPrime.uz da!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/preview/${id}`,
      type: 'article',
      siteName: 'EduPrime.uz',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
