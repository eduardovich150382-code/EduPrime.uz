import { setRequestLocale } from 'next-intl/server';
import { generateLocaleStaticParams } from '@/i18n/static-params';
import LoginForm from '@/components/auth/LoginForm';

// Statik: build'da har til uchun HTML, CDN'dan beriladi — reklama trafigida
// mehmon har ochganda funksiya ishga tushmaydi. URL parametrlari (error,
// callbackUrl, ref) klientda, Suspense ichida (LoginForm). Kirgan foydalanuvchi
// bu sahifaga yetib kelmaydi: middleware cookie bo'yicha /dashboard ga
// yo'naltiradi (statik sahifadan oldin ishlaydi).
export const generateStaticParams = generateLocaleStaticParams;

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginForm />;
}
