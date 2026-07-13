'use client';

import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  BookOpen,
  Trophy,
  Target,
  Flame,
  ArrowRight,
  Clock,
  TrendingUp,
  Crown,
} from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { data: session } = useSession();

  const userName = session?.user?.name || 'Foydalanuvchi';

  // Mock data (will be replaced with real data)
  const stats = [
    { label: t('stats.totalTests'), value: '24', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: t('stats.avgScore'), value: '78%', icon: Target, color: 'bg-green-50 text-green-600' },
    { label: t('stats.rank'), value: '#156', icon: Trophy, color: 'bg-yellow-50 text-yellow-600' },
    { label: t('stats.streak'), value: '5 kun', icon: Flame, color: 'bg-red-50 text-red-600' },
  ];

  const recentResults = [
    { id: '1', test: 'DTM Matematika #12', score: 85, date: '2 soat oldin', subject: 'Matematika' },
    { id: '2', test: 'Fizika Attestatsiya', score: 72, date: 'Kecha', subject: 'Fizika' },
    { id: '3', test: 'Ingliz tili SAT', score: 91, date: '3 kun oldin', subject: 'Ingliz tili' },
  ];

  const quickActions = [
    { label: 'DTM test yechish', href: '/tests?type=dtm', icon: BookOpen },
    { label: 'Maktab testi', href: '/tests?type=school', icon: BookOpen },
    { label: 'Reyting ko\'rish', href: '/rating', icon: Trophy },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {t('welcome')}, <span className="gradient-text">{userName}</span> 👋
        </h1>
        <p className="text-text-secondary mt-1">Bugungi natijalaringizni ko&apos;ring</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">{t('recentResults')}</h2>
            <Link href="/results" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Barchasi <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-primary-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <BookOpen size={18} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">{result.test}</p>
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <Clock size={12} /> {result.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {result.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('quickActions')}</h2>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <action.icon size={16} className="text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{action.label}</span>
                  <ArrowRight size={14} className="ml-auto text-text-secondary group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Subscription status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('subscription')}</h2>
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} className="text-primary-600" />
                <span className="font-semibold text-primary-700">Bepul reja</span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Premium ga o&apos;ting — barcha testlarga cheksiz ruxsat oling
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <TrendingUp size={14} />
                Premium ga o&apos;tish
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
