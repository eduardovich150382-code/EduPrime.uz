import type { Metadata } from 'next';

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
