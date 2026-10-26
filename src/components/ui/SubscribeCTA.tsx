'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useSubscriptionStatus } from './useSubscriptionStatus';

// Header tugmasi — ko'rsatish sharti HeaderSubscription'da, bu yerda faqat ko'rinish.
export function SubscribeButton({ href = '/pricing', compact = false }: { href?: string; compact?: boolean }) {
  const t = useTranslations('subscriptionUi');
  return (
    <Link
      href={href}
      aria-label={t('subscribe')}
      className="relative group flex min-h-11 shrink-0 items-center gap-1.5 px-3 rounded-lg text-sm font-semibold text-purple-700 transition-all duration-300 hover:scale-105"
    >
      {/* Animated gradient border */}
      <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-[2px] animate-gradient-border">
        <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-white group-hover:bg-purple-50 transition-colors" />
      </span>
      <span className="relative flex items-center gap-1.5 whitespace-nowrap">
        <Sparkles size={14} aria-hidden className="text-purple-600" />
        {compact ? t('subscribeShort') : t('subscribe')}
      </span>
    </Link>
  );
}

// Sahifa ichidagi taklif kartasi. Obunasi yoki admin ruxsati bor foydalanuvchiga,
// holat yuklanayotganda ham ko'rsatilmaydi — obunachi "Obuna olish"ni ko'rmasin.
export default function SubscribeCTA({ className = '' }: { className?: string }) {
  const t = useTranslations('subscriptionUi');
  const { data: session, status: authStatus } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const status = useSubscriptionStatus(authStatus === 'authenticated' && !isAdmin);
  if (authStatus === 'loading' || isAdmin) return null;
  if (authStatus === 'authenticated' && (!status || status.hasAnyScope || status.subscriptions.length)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 relative overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Sparkles size={20} aria-hidden className="text-primary-700" />
        </div>
        <div>
          <h3 className="font-bold text-text-primary">{t('cta.title')}</h3>
          <p className="text-xs text-text-secondary">{t('cta.subtitle')}</p>
        </div>
      </div>

      <ul className="space-y-2 mb-4 text-sm text-text-secondary">
        {(['feature1', 'feature2', 'feature3'] as const).map((key) => (
          <li key={key} className="flex items-center gap-2">
            <Check size={14} aria-hidden className="shrink-0 text-primary-600" />
            {t(`cta.${key}`)}
          </li>
        ))}
      </ul>

      <Link
        href="/pricing"
        className="w-full inline-flex min-h-11 items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
      >
        {t('subscribe')}
      </Link>
    </motion.div>
  );
}
