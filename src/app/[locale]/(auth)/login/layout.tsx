import type { Metadata } from 'next';

// [locale] layout statik bo'lgach bu sahifa ham prerender qilinardi, lekin u
// `useSearchParams` (error, callbackUrl, ref) dan render bo'ladi — Suspense
// bilan o'ralsa HTML JS yuklanguncha bo'sh qolardi. Avvalgidek serverda.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Kirish — EduPrime.uz",
  description: "EduPrime.uz ga Telegram yoki Google orqali kiring. Bepul ro'yxatdan o'ting va testlarni yechishni boshlang.",
  openGraph: {
    title: "Kirish — EduPrime.uz",
    description: "Telegram yoki Google orqali kiring. Bepul ro'yxatdan o'ting.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
