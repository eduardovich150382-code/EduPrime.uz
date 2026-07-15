'use client';

import { useEffect, useState } from 'react';
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
  Loader2,
} from 'lucide-react';

interface RecentResult {
  id: string;
  testTitle: string;
  percentage: number;
  completedAt: string;
}

interface DashboardStats {
  totalTests: number;
  avgScore: number;
  rank: number;
  streak: number;
  recentResults: RecentResult[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
  ];
  return `${date.getDate()}-${months[date.getMonth()]}`;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { data: session } = useSession();
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userName = session?.user?.name || 'Foydalanuvchi';

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStatsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const stats = [
    {
      label: t('stats.totalTests'),
      value: loading ? '...' : String(statsData?.totalTests || 0),
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: t('stats.avgScore'),
      value: loading ? '...' : statsData?.avgScore ? `${statsData.avgScore}%` : '—',
      icon: Target,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: t('stats.rank'),
      value: loading ? '...' : statsData?.rank ? `#${statsData.rank}` : '—',
      icon: Trophy,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: t('stats.streak'),
      value: loading ? '...' : `${statsData?.streak || 0} kun`,
      icon: Flame,
      color: 'bg-red-50 text-red-600',
    },
  ];

  const recentResults = statsData?.recentResults || [];

  const quickActions = [
    { label: 'DTM test yechish', href: '/tests?type=DTM', icon: BookOpen },
    { label: 'Maktab testi', href: '/tests?type=SCHOOL', icon: BookOpen },
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
            <Link href="/tests" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Barchasi <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
            </div>
          ) : recentResults.length > 0 ? (
            <div className="space-y-3">
              {recentResults.map((result) => (
                <Link
                  key={result.id}
                  href={`/results/${result.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-primary-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <BookOpen size={18} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">{result.testTitle}</p>
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock size={12} /> {formatDate(result.completedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      result.percentage >= 80 ? 'text-green-600' : result.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.percentage}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-gray-400" />
              </div>
              <p className="text-text-secondary text-sm">Hali test yechilmagan</p>
            </div>
          )}
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
