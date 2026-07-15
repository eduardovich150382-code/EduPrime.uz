'use client';

import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Send, ArrowLeft, Sparkles } from 'lucide-react';
import SessionProvider from '@/components/providers/SessionProvider';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function LoginContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleTelegramLogin = () => {
    window.open('https://t.me/EduPrimeuzbot?start=login', '_blank');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-300/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Bosh sahifa</span>
        </Link>

        <div className="card-elevated p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-bold">
                Edu<span className="gradient-text">Prime</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Kirish yoki Ro&apos;yxatdan o&apos;tish
            </h1>
            <p className="text-text-secondary text-sm">
              Telegram yoki Google orqali kiring — yangi bo&apos;lsangiz avtomatik ro&apos;yxatga olinasiz
            </p>
          </div>

          {/* Auth buttons */}
          <div className="space-y-4">
            {/* Telegram button */}
            <a
              href="https://t.me/EduPrimeuzbot?start=login"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold transition-all duration-300 shadow-lg shadow-[#2AABEE]/25 hover:shadow-xl hover:shadow-[#2AABEE]/30"
            >
              <Send size={20} />
              Telegram orqali kirish
            </a>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-text-secondary">yoki</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white border-2 border-border hover:border-primary-200 text-text-primary font-semibold transition-all duration-300 hover:shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google orqali kirish
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 rounded-xl bg-primary-50 border border-primary-100">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-text-secondary leading-relaxed">
                Birinchi marta kiryapsizmi? Hech qanday muammo yo&apos;q — avtomatik ro&apos;yxatga olinasiz!
                Telegram orqali kirish uchun pastdagi tugmani bosing va botda &quot;Saytga kirish&quot; ni tanlang.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SessionProvider>
      <LoginContent />
    </SessionProvider>
  );
}
