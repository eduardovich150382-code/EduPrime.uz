'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  BookOpen, Plus, Eye, TrendingUp, Users, DollarSign,
  ArrowRight, FileText, Video,
} from 'lucide-react';

export default function TeacherDashboard() {
  const stats = [
    { label: 'Jami testlar', value: '12', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Ko\'rishlar', value: '1,450', icon: Eye, color: 'bg-green-50 text-green-600' },
    { label: 'O\'quvchilar', value: '89', icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Daromad', value: '340K', icon: DollarSign, color: 'bg-yellow-50 text-yellow-600' },
  ];

  const recentTests = [
    { id: '1', title: 'Matematika DTM #5', students: 34, avgScore: 72, isFree: false },
    { id: '2', title: 'Algebra 11-sinf', students: 56, avgScore: 81, isFree: true },
    { id: '3', title: 'Geometriya amaliy', students: 23, avgScore: 65, isFree: false },
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

      {/* Recent tests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Mening testlarim</h2>
          <Link href="/teacher/tests" className="text-sm text-primary-600 flex items-center gap-1">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-3">
          {recentTests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-primary-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <FileText size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-text-primary text-sm">{test.title}</p>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                    <span>{test.students} o&apos;quvchi</span>
                    <span>O&apos;rtacha: {test.avgScore}%</span>
                    <span className={`px-1.5 py-0.5 rounded ${test.isFree ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>
                      {test.isFree ? 'Bepul' : 'Pulli'}
                    </span>
                  </div>
                </div>
              </div>
              <Link href={`/teacher/tests/${test.id}`} className="btn-ghost text-xs">
                Tahrirlash
              </Link>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
