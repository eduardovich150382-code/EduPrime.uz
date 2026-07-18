'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Users, Crown, GraduationCap, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';

interface SubUser {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
  telegramUsername: string | null;
  plan: string;
  endDate: string | null;
}

interface Stats {
  totalUsers: number;
  premiumCount: number;
  teacherCount: number;
  freeCount: number;
  expiringCount: number;
}

type FilterType = 'all' | 'premium' | 'teacher' | 'free' | 'expiring';

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchData(filter);
  }, [filter]);

  async function fetchData(f: FilterType) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions?filter=${f}&limit=50`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
    setLoading(false);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '∞';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getPlanBadge(plan: string) {
    switch (plan) {
      case 'Premium': return 'bg-purple-100 text-purple-700';
      case 'Ustoz': return 'bg-blue-100 text-blue-700';
      case 'Premium+Ustoz': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Hammasi', count: stats?.totalUsers },
    { key: 'premium', label: 'Premium', count: stats?.premiumCount },
    { key: 'teacher', label: 'Ustoz', count: stats?.teacherCount },
    { key: 'free', label: 'Bepul', count: stats?.freeCount },
    { key: 'expiring', label: 'Tugayotgan', count: stats?.expiringCount },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary">Obunalar boshqaruvi</h1>
        <p className="text-text-secondary text-sm mt-1">Foydalanuvchilar tariflari va obuna holati</p>
      </motion.div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="card p-4 text-center">
            <Users size={20} className="text-text-secondary mx-auto mb-1" />
            <p className="text-2xl font-bold text-text-primary">{stats.totalUsers}</p>
            <p className="text-xs text-text-secondary">Jami</p>
          </div>
          <div className="card p-4 text-center">
            <Crown size={20} className="text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{stats.premiumCount}</p>
            <p className="text-xs text-text-secondary">Premium</p>
          </div>
          <div className="card p-4 text-center">
            <GraduationCap size={20} className="text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{stats.teacherCount}</p>
            <p className="text-xs text-text-secondary">Ustoz</p>
          </div>
          <div className="card p-4 text-center">
            <Sparkles size={20} className="text-gray-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-text-primary">{stats.freeCount}</p>
            <p className="text-xs text-text-secondary">Bepul</p>
          </div>
          <div className="card p-4 text-center">
            <AlertTriangle size={20} className="text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-600">{stats.expiringCount}</p>
            <p className="text-xs text-text-secondary">Tugayotgan</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            {f.label} {f.count !== undefined && <span className="ml-1 opacity-70">({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Foydalanuvchi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Tarif</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Tugash muddati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12">
                    <Loader2 size={24} className="animate-spin text-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-text-secondary text-sm">
                    Foydalanuvchilar topilmadi
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {user.image ? (
                            <Image src={user.image} alt="" width={36} height={36} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                              {(user.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{user.name || 'Nomsiz'}</p>
                          <p className="text-xs text-text-secondary truncate">{user.telegramUsername ? `@${user.telegramUsername}` : user.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPlanBadge(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDate(user.endDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
