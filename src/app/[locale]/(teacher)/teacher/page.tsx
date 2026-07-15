'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  BookOpen, Plus, Eye, Users, DollarSign,
  ArrowRight, FileText, Loader2, Pencil, Trash2,
} from 'lucide-react';

interface StatsData {
  totalTests: number;
  totalViews: number;
  totalStudents: number;
  totalRevenue: number;
}

interface TestItem {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  isPublished: boolean;
  isFree: boolean;
  price: number;
  studentCount: number;
  avgScore: number;
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/teacher/stats').then(r => r.json()),
      fetch('/api/teacher/tests').then(r => r.json()),
    ]).then(([statsData, testsData]) => {
      setStats(statsData);
      if (testsData.tests) setTests(testsData.tests.slice(0, 5));
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (testId: string) => {
    if (!confirm("Bu testni o'chirishni tasdiqlaysizmi?")) return;
    setDeleting(testId);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      if (res.ok) {
        setTests(tests.filter(t => t.id !== testId));
        if (stats) setStats({ ...stats, totalTests: stats.totalTests - 1 });
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch {
      alert("Server xatolik");
    }
    setDeleting(null);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  const statsCards = [
    {
      label: 'Jami testlar',
      value: stats ? stats.totalTests.toString() : '...',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
      href: '/teacher/tests',
    },
    {
      label: "Ko'rishlar",
      value: stats ? formatNumber(stats.totalViews) : '...',
      icon: Eye,
      color: 'bg-green-50 text-green-600',
      href: '/teacher/tests',
    },
    {
      label: "O'quvchilar",
      value: stats ? formatNumber(stats.totalStudents) : '...',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      href: '/teacher/tests',
    },
    {
      label: 'Daromad',
      value: stats ? formatNumber(stats.totalRevenue) : '...',
      icon: DollarSign,
      color: 'bg-yellow-50 text-yellow-600',
      href: '/teacher/tests',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Ustoz paneli
          </h1>
          <p className="text-text-secondary mt-1">Testlaringizni boshqaring va natijalarni kuzating</p>
        </div>
        <Link href="/teacher/tests/create" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Yangi test
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsCards.map((stat, i) => (
          <Link key={i} href={stat.href} className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon size={22} />
              </div>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Recent tests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Mening testlarim</h2>
          <Link href="/teacher/tests" className="text-sm text-primary-600 flex items-center gap-1 hover:underline">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-text-secondary mx-auto mb-3 opacity-50" />
            <p className="text-sm text-text-secondary mb-4">Hali test yaratilmagan</p>
            <Link href="/teacher/tests/create" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={14} /> Birinchi testni yarating
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-primary-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary text-sm truncate">{test.titleUz}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                        test.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {test.isPublished ? 'Nashr' : 'Qoralama'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                      <span>{test.studentCount} o&apos;quvchi</span>
                      <span>O&apos;rtacha: {test.avgScore}%</span>
                      <span className={`px-1.5 py-0.5 rounded ${test.isFree ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>
                        {test.isFree ? 'Bepul' : 'Pulli'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Link href={`/teacher/tests/${test.id}/edit`} className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors">
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(test.id)}
                    disabled={deleting === test.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {deleting === test.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
