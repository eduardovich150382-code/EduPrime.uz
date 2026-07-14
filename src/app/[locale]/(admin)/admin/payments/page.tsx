'use client';

import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, User, Search,
} from 'lucide-react';

const mockPayments = [
  { id: '1', user: 'Sardor Aliyev', username: '@sardor_a', plan: 'Premium', duration: '1 oy', amount: 29000, status: 'confirmed', date: '2026-07-14 03:45' },
  { id: '2', user: 'Nilufar K.', username: '@nilufar_k', plan: 'Ustoz', duration: '6 oy', amount: 150000, status: 'pending', date: '2026-07-14 02:30' },
  { id: '3', user: 'Jasur T.', username: '@jasur_t', plan: 'Premium', duration: '1 yil', amount: 270000, status: 'rejected', date: '2026-07-13 18:00' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"><CheckCircle size={12} /> Tasdiqlangan</span>;
    case 'rejected': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"><XCircle size={12} /> Rad etilgan</span>;
    default: return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Clock size={12} /> Kutilmoqda</span>;
  }
}

export default function AdminPaymentsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <CreditCard size={24} className="text-primary-600" />
          To&apos;lovlar
        </h1>
        <p className="text-text-secondary mt-1">Barcha to&apos;lovlar va ularning holatlari</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">1</p>
          <p className="text-xs text-text-secondary">Kutilmoqda</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">1</p>
          <p className="text-xs text-text-secondary">Tasdiqlangan</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">1</p>
          <p className="text-xs text-text-secondary">Rad etilgan</p>
        </div>
      </div>

      {/* Payments list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Foydalanuvchi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Tarif</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Summa</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Holat</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Sana</th>
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-border hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-text-primary text-sm">{payment.user}</p>
                      <p className="text-xs text-text-secondary">{payment.username}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.plan} ({payment.duration})</td>
                  <td className="px-6 py-4 text-sm font-semibold">{payment.amount.toLocaleString()} so&apos;m</td>
                  <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
