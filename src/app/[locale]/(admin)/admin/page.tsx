'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { localizedName } from '@/lib/pricing';
import type { LocalizedName } from '@/lib/subscription-details';
import {
  Users, BookOpen, CreditCard, TrendingUp, Shield,
  Clock, Crown, UserPlus, ArrowRight, BarChart3, Loader2, CalendarCheck, CalendarRange, type LucideIcon,
} from 'lucide-react';

interface DashboardData {
  subscriptionProducts: { id: string; name: LocalizedName; count: number }[];
  stats: {
    todayNewUsers: number;
    todayTestsCompleted: number;
    pendingPayments: number;
    activeSubscriptions: number;
    totalUsers: number;
    totalTests: number;
  };
  online: { onlineNow: number; activeToday: number; active7d: number };
  // S20a — sifat halqasi ko'rsatkichi: "Yozma yechimi bor savollar" (Item.explanationSource !== NONE).
  explanationCoverage: { withExplanation: number; total: number };
  weeklyGrowth: { date: string; count: number }[];
  recentPayments: {
    id: string;
    userName: string | null;
    telegramUsername: string | null;
    userImage: string | null;
    plan: string;
    name: LocalizedName;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  topTests: {
    id: string;
    titleUz: string;
    subject: { nameUz: string; icon: string | null };
    attempts: number;
  }[];
}

interface StatCard {
  key: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  valueClass?: string;
  // Har karta ko'pi bilan bitta aniq manzilga olib boradi; mos filtr bo'lmasa
  // (masalan "bugungi yangi") karta bosilmaydi — noaniq havola qo'yilmaydi.
  href?: string;
}

export default function AdminDashboard() {
  const locale = useLocale();
  const t = useTranslations('adminDashboard');
  const tSubscription = useTranslations('subscriptionUi');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <Shield size={48} className="text-red-400 mx-auto mb-4" />
        <p className="text-text-secondary">{t('loadError')}</p>
      </div>
    );
  }

  const { stats, explanationCoverage, weeklyGrowth, recentPayments, topTests } = data;
  const maxGrowth = Math.max(...weeklyGrowth.map(d => d.count), 1);
  const explanationCoveragePct = explanationCoverage.total > 0
    ? Math.round((explanationCoverage.withExplanation / explanationCoverage.total) * 1000) / 10
    : 0;
  const statCards: StatCard[] = [
    { key: 'todayNewUsers', value: stats.todayNewUsers, icon: UserPlus, iconClass: 'text-blue-600' },
    { key: 'todayTests', value: stats.todayTestsCompleted, icon: BookOpen, iconClass: 'text-green-600' },
    { key: 'pendingPayments', value: stats.pendingPayments, icon: Clock, iconClass: 'text-yellow-600', valueClass: 'text-yellow-600', href: '/admin/payments?status=PENDING' },
    { key: 'activeSubscriptions', value: stats.activeSubscriptions, icon: Crown, iconClass: 'text-purple-600', href: '/admin/subscriptions' },
    { key: 'totalUsers', value: stats.totalUsers, icon: Users, iconClass: 'text-text-secondary', href: '/admin/users' },
    { key: 'totalTests', value: stats.totalTests, icon: BarChart3, iconClass: 'text-text-secondary', href: '/admin/tests' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
          <Shield size={28} className="text-primary-600" />
          {t('title')}
        </h1>
        <p className="text-text-secondary mt-1">{t('subtitle')}</p>
      </motion.div>

      {/* Onlayn — eng tepada: reklama paytida adminning birinchi savoli. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/admin/online" className="card p-4 min-h-11 flex items-center gap-3 hover:border-green-300 transition-colors">
          <span className="relative flex h-3 w-3 flex-shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-bold text-green-700">{data.online.onlineNow}</span>
            <span className="block text-xs text-text-secondary">{t('online.now')}</span>
          </span>
          <ArrowRight size={16} className="ml-auto text-text-secondary" aria-hidden />
        </Link>
        <div className="card p-4 flex items-center gap-3">
          <CalendarCheck size={18} className="text-primary-600 flex-shrink-0" aria-hidden />
          <span>
            <span className="block text-2xl font-bold text-text-primary">{data.online.activeToday}</span>
            <span className="block text-xs text-text-secondary">{t('online.today')}</span>
          </span>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <CalendarRange size={18} className="text-primary-600 flex-shrink-0" aria-hidden />
          <span>
            <span className="block text-2xl font-bold text-text-primary">{data.online.active7d}</span>
            <span className="block text-xs text-text-secondary">{t('online.week')}</span>
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {statCards.map((card) => {
          const body = <>
            <card.icon size={18} className={`${card.iconClass} mb-2`} aria-hidden />
            <p className={`text-2xl font-bold ${card.valueClass ?? 'text-text-primary'}`}>{card.value}</p>
            <p className="text-xs text-text-secondary">{t(`stats.${card.key}`)}</p>
          </>;
          return card.href ? (
            <Link key={card.key} href={card.href} className="card p-4 min-h-11 hover:border-primary-300 transition-colors">
              {body}
            </Link>
          ) : <div key={card.key} className="card p-4">{body}</div>;
        })}
      </motion.div>

      <section className="card min-w-0 space-y-3 p-4">
        <h2 className="text-sm font-semibold">{tSubscription('productStats')}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.subscriptionProducts.map((product) => <div key={product.id} className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-background p-3 text-sm">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{localizedName(product.name, locale)}</span><strong>{product.count}</strong>
          </div>)}
        </div>
      </section>

      {/* S20a — sifat halqasi ko'rsatkichi: yozma/AI (mualliflikka
          ko'tarilgan) yechimi bor savollar ulushi. Bu raqam pastga
          tushayotgan bo'lsa — parametrik shablonlar yoki o'qituvchi
          savollari qo'shilishi tezlashgan, lekin ularga yechim yozish
          ortda qolgan degani. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-4 flex items-center gap-3"
      >
        <BookOpen size={18} className="text-primary-600 flex-shrink-0" />
        <p className="text-sm text-text-primary">
          {t('explanationCoverage')}{' '}
          <span className="font-semibold">
            {explanationCoverage.withExplanation} / {explanationCoverage.total}
          </span>{' '}
          <span className="text-text-secondary">({explanationCoveragePct}%)</span>
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly growth chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-600" />
              {t('weeklyGrowth')}
            </h2>
          </div>
          <div className="flex items-end gap-2 h-32">
            {weeklyGrowth.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-text-secondary font-medium">{day.count}</span>
                <div
                  className="w-full bg-primary-200 rounded-t-md transition-all hover:bg-primary-400"
                  style={{ height: `${Math.max((day.count / maxGrowth) * 100, 4)}%` }}
                />
                <span className="text-[9px] text-text-secondary">{day.date}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top 5 tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          {/* "Barchasi" havolasi yo'q — /admin/tests ga "Jami test" kartasi olib boradi. */}
          <h2 className="text-sm font-semibold text-text-primary mb-4">{t('topTests')}</h2>
          {topTests.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">{t('noTests')}</p>
          ) : (
            <div className="space-y-3">
              {topTests.map((test, i) => (
                <Link key={test.id} href={`/admin/tests/${test.id}/reyting`} className="flex min-h-11 items-center gap-3 rounded-lg -mx-2 px-2 hover:bg-primary-50/50">
                  <span className="text-xs font-bold text-text-secondary w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{test.titleUz}</p>
                    <p className="text-xs text-text-secondary">{test.subject.icon} {test.subject.nameUz}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary-600">{t('attempts', { count: test.attempts })}</span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent payments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CreditCard size={16} className="text-green-600" />
            {t('recentPayments')}
          </h2>
          <Link href="/admin/payments" className="min-h-11 px-2 text-xs text-primary-600 hover:underline flex items-center gap-1">
            {t('allPayments')} <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">{t('noPayments')}</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {(p.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {p.userName || p.telegramUsername || t('unnamed')}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {localizedName(p.name, locale)} — {t('amount', { amount: p.amount.toLocaleString() })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  p.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {t(p.status === 'CONFIRMED' ? 'status.confirmed' : p.status === 'REJECTED' ? 'status.rejected' : 'status.pending')}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
