'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Users, BookOpen, CreditCard, TrendingUp, Shield,
  Clock, Crown, UserPlus, CheckCircle, XCircle,
  ArrowRight, BarChart3, Loader2,
} from 'lucide-react';

interface DashboardData {
  stats: {
    todayNewUsers: number;
    todayTestsCompleted: number;
    pendingPayments: number;
    activeSubscriptions: number;
    totalUsers: number;
    totalTests: number;
  };
  weeklyGrowth: { date: string; count: number }[];
  recentPayments: {
    id: string;
    userName: string | null;
    telegramUsername: string | null;
    userImage: string | null;
    plan: string;
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

export default function AdminDashboard() {
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
        <p className="text-text-secondary">Ma&apos;lumotlarni yuklashda xatolik</p>
      </div>
    );
  }

  const { stats, weeklyGrowth, recentPayments, topTests } = data;
  const maxGrowth = Math.max(...weeklyGrowth.map(d => d.count), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
          <Shield size={28} className="text-primary-600" />
          Admin Panel
        </h1>
        <p className="text-text-secondary mt-1">Platformani boshqaring</p>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <div className="card p-4">
          <UserPlus size={18} className="text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.todayNewUsers}</p>
          <p className="text-xs text-text-secondary">Bugungi yangi</p>
        </div>
        <div className="card p-4">
          <BookOpen size={18} className="text-green-600 mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.todayTestsCompleted}</p>
          <p className="text-xs text-text-secondary">Bugungi testlar</p>
        </div>
        <Link href="/admin/payments" className="card p-4 hover:border-yellow-300 transition-colors">
          <Clock size={18} className="text-yellow-600 mb-2" />
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
          <p className="text-xs text-text-secondary">Kutayotgan to&apos;lov</p>
        </Link>
        <div className="card p-4">
          <Crown size={18} className="text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.activeSubscriptions}</p>
          <p className="text-xs text-text-secondary">Aktiv obuna</p>
        </div>
        <div className="card p-4">
          <Users size={18} className="text-text-secondary mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.totalUsers}</p>
          <p className="text-xs text-text-secondary">Jami user</p>
        </div>
        <div className="card p-4">
          <BarChart3 size={18} className="text-text-secondary mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.totalTests}</p>
          <p className="text-xs text-text-secondary">Jami test</p>
        </div>
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
              Haftalik o&apos;sish (yangi foydalanuvchilar)
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Top testlar</h2>
            <Link href="/admin/tests" className="text-xs text-primary-600 hover:underline">
              Barchasi
            </Link>
          </div>
          {topTests.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">Testlar yo&apos;q</p>
          ) : (
            <div className="space-y-3">
              {topTests.map((test, i) => (
                <div key={test.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-secondary w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{test.titleUz}</p>
                    <p className="text-xs text-text-secondary">{test.subject.icon} {test.subject.nameUz}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary-600">{test.attempts} marta</span>
                </div>
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
            Oxirgi to&apos;lovlar
          </h2>
          <Link href="/admin/payments" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Barchasi <ArrowRight size={12} />
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">To&apos;lovlar yo&apos;q</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {(p.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {p.userName || p.telegramUsername || 'Nomsiz'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {p.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'} — {p.amount.toLocaleString()} so&apos;m
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  p.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {p.status === 'CONFIRMED' ? 'Tasdiqlangan' : p.status === 'REJECTED' ? 'Rad' : 'Kutilmoqda'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Link href="/admin/users" className="card p-4 text-center hover:border-primary-200">
          <Users size={20} className="text-blue-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-text-primary">Foydalanuvchilar</p>
        </Link>
        <Link href="/admin/tests" className="card p-4 text-center hover:border-primary-200">
          <BookOpen size={20} className="text-green-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-text-primary">Testlar</p>
        </Link>
        <Link href="/admin/teachers" className="card p-4 text-center hover:border-primary-200">
          <Crown size={20} className="text-orange-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-text-primary">Ustozlar</p>
        </Link>
        <Link href="/admin/subscriptions" className="card p-4 text-center hover:border-primary-200">
          <Crown size={20} className="text-purple-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-text-primary">Obunalar</p>
        </Link>
      </motion.div>
    </div>
  );
}
