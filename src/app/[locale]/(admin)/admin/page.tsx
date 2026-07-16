'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import {
  Users, BookOpen, CreditCard, GraduationCap, TrendingUp,
  AlertCircle, CheckCircle, ArrowRight, Shield, Settings, Bot,
  UserPlus, Send, Lock, Unlock,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  // Check if user is admin
  if (userRole !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Shield size={64} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Ruxsat yo&apos;q</h1>
        <p className="text-text-secondary mb-6">
          Bu sahifa faqat adminlar uchun. Agar siz admin bo&apos;lsangiz, 
          qayta login qilib ko&apos;ring.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Dashboard ga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
          <Shield size={28} className="text-primary-600" />
          Admin Panel
        </h1>
        <p className="text-text-secondary mt-1">Platformani boshqaring</p>
      </motion.div>

      {/* Quick links grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <Link href="/admin/users" className="card p-6 hover:border-primary-200 group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Foydalanuvchilar</h3>
          <p className="text-sm text-text-secondary">Ro&apos;yxat, rollarni boshqarish, ustoz tayinlash</p>
        </Link>

        <Link href="/admin/payments" className="card p-6 hover:border-primary-200 group">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CreditCard size={24} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">To&apos;lovlar</h3>
          <p className="text-sm text-text-secondary">Chek tekshirish, tarif tasdiqlash/rad etish</p>
        </Link>

        <Link href="/admin/permissions" className="card p-6 hover:border-primary-200 group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lock size={24} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Ruxsatlar</h3>
          <p className="text-sm text-text-secondary">Kategoriyalar bo&apos;yicha ruxsat berish/olish</p>
        </Link>

        <Link href="/teacher" className="card p-6 hover:border-primary-200 group">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap size={24} className="text-orange-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Ustoz paneli</h3>
          <p className="text-sm text-text-secondary">Testlar yaratish, tahrirlash, boshqarish</p>
        </Link>

        <Link href="/admin/notifications" className="card p-6 hover:border-primary-200 group">
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Send size={24} className="text-pink-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Xabar yuborish</h3>
          <p className="text-sm text-text-secondary">Barcha foydalanuvchilarga bildirishnoma</p>
        </Link>

        <div className="card p-6 hover:border-primary-200 group cursor-pointer" onClick={() => window.open('https://t.me/EduPrimeuzbot', '_blank')}>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Bot size={24} className="text-cyan-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Telegram Bot</h3>
          <p className="text-sm text-text-secondary">Bot orqali /admin, /broadcast, /users buyruqlari</p>
        </div>

        <div className="card p-6 border-dashed border-2 flex items-center justify-center text-center">
          <div>
            <Settings size={24} className="text-text-secondary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">Qo&apos;shimcha sozlamalar tez orada...</p>
          </div>
        </div>
      </motion.div>

      {/* Admin info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">📋 Admin bo&apos;yicha yo&apos;riqnoma</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">👨‍🏫 Ustoz tayinlash</h4>
            <p className="text-blue-700">Foydalanuvchilar bo&apos;limiga o&apos;ting → foydalanuvchini toping → rolni &quot;TEACHER&quot; ga o&apos;zgartiring</p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">💰 To&apos;lov tasdiqlash</h4>
            <p className="text-green-700">Telegram botda chek kelganda ✅ Tasdiqlash tugmasini bosing — tarif avtomatik ochiladi</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-2">📢 Xabar yuborish</h4>
            <p className="text-purple-700">Telegram botda: /broadcast Salom, yangi testlar qo&apos;shildi!</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
            <h4 className="font-semibold text-orange-800 mb-2">🔓 Ruxsat berish</h4>
            <p className="text-orange-700">Ruxsatlar bo&apos;limiga o&apos;ting → foydalanuvchini toping → kategoriyani oching</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
