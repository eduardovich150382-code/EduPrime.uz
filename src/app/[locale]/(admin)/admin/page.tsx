'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Users, BookOpen, CreditCard, GraduationCap, TrendingUp,
  UserCheck, AlertCircle, CheckCircle, ArrowRight,
  Shield, Settings, Bot,
} from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Foydalanuvchilar', value: '1,234', icon: Users, color: 'bg-blue-50 text-blue-600', change: '+12%' },
    { label: 'Ustozlar', value: '18', icon: GraduationCap, color: 'bg-purple-50 text-purple-600', change: '+3' },
    { label: 'Testlar', value: '156', icon: BookOpen, color: 'bg-green-50 text-green-600', change: '+8' },
    { label: 'Daromad (oy)', value: '4.2M', icon: CreditCard, color: 'bg-yellow-50 text-yellow-600', change: '+23%' },
  ];

  const pendingPayments = [
    { id: '1', user: '@student123', plan: 'Premium', duration: '1 oy', amount: '29,000', time: '5 daqiqa oldin' },
    { id: '2', user: '@teacher_ali', plan: 'Ustoz', duration: '6 oy', amount: '150,000', time: '1 soat oldin' },
    { id: '3', user: '@user_456', plan: 'Premium', duration: '1 yil', amount: '270,000', time: '3 soat oldin' },
  ];

  const quickLinks = [
    { label: 'Foydalanuvchilar', href: '/admin/users', icon: Users },
    { label: 'To\'lovlar', href: '/admin/payments', icon: CreditCard },
    { label: 'Ruxsatlar', href: '/admin/permissions', icon: Shield },
    { label: 'Bot sozlamalari', href: '/admin/bot', icon: Bot },
    { label: 'Sozlamalar', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Admin Panel</h1>
        <p className="text-text-secondary mt-1">Platformani boshqaring va statistikani kuzating</p>
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
                <span className="text-xs text-green-600 font-medium">{stat.change}</span>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Kutilayotgan to&apos;lovlar</h2>
              <span className="w-6 h-6 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center justify-center">
                {pendingPayments.length}
              </span>
            </div>
            <Link href="/admin/payments" className="text-sm text-primary-600 flex items-center gap-1">
              Barchasi <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 border border-yellow-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <AlertCircle size={18} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">{payment.user}</p>
                    <p className="text-xs text-text-secondary">
                      {payment.plan} • {payment.duration} • {payment.amount} so&apos;m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors flex items-center gap-1">
                    <CheckCircle size={12} />
                    Tasdiqlash
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors">
                    Rad
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4">Tez havolalar</h2>
          <div className="space-y-2">
            {quickLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <link.icon size={16} className="text-primary-600" />
                </div>
                <span className="text-sm font-medium text-text-primary">{link.label}</span>
                <ArrowRight size={14} className="ml-auto text-text-secondary group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
