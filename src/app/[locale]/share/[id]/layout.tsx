import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  // Fetch result data for dynamic metadata
  let result: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/share/result/${id}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      result = data.result;
    }
  } catch {
    // Fallback
  }

  if (!result) {
    return {
      title: 'Test natijasi — EduPrime.uz',
      description: "EduPrime.uz da test yeching va natijangizni do'stlaringiz bilan ulashing!",
    };
  }

  const userName = result.user?.name || 'Foydalanuvchi';
  const testTitle = result.test?.titleUz || 'Test';
  const percentage = result.percentage || 0;
  const scoreEmoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '✅' : '📚';

  const title = `${scoreEmoji} ${userName} — ${percentage}% natija`;
  const description = `"${testTitle}" testidan ${percentage}% natija! Siz ham o'zingizni sinab ko'ring — EduPrime.uz`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/share/${id}`,
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

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
