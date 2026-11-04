import type { Metadata } from 'next';

// Sahifa statik (page.tsx). `force-dynamic` olib tashlandi: avvalgi xavotir —
// `useSearchParams` Suspense bilan o'ralsa HTML JS yuklanguncha bo'sh qolardi —
// endi yo'q, chunki Suspense ichida faqat xato xabari, karta va tugmalar
// tashqarida (components/auth/LoginForm.tsx).

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
