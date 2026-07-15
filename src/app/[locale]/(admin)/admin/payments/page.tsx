'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, User, Search,
  Loader2, RefreshCw, Image as ImageIcon, Filter,
} from 'lucide-react';

interface PaymentData {
  id: string;
  plan: string;
  duration: string;
  amount: number;
  status: string;
  receiptPhoto: string | null;
  createdAt: string;
  confirmedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    telegramUsername: string | null;
    image: string | null;
  };
  confirmedBy: {
    id: string;
    name: string | null;
  } | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
          <CheckCircle size={12} /> Tasdiqlangan
        </span>
      );
    case 'REJECTED':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
          <XCircle size={12} /> Rad etilgan
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
          <Clock size={12} /> Kutilmoqda
        </span>
      );
  }
}

function getDurationLabel(duration: string) {
  switch (duration) {
    case 'ONE_MONTH': return '1 oy';
    case 'SIX_MONTHS': return '6 oy';
    case 'ONE_YEAR': return '1 yil';
    default: return duration;
  }
}

function getPlanLabel(plan: string) {
  switch (plan) {
    case 'PREMIUM': return 'Premium';
    case 'TEACHER_PLAN': return 'Ustoz';
    default: return plan;
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [counts, setCounts] = useState({ pending: 0, confirmed: 0, rejected: 0 });
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleAction = async (paymentId: string, action: 'confirm' | 'reject') => {
    setProcessing(paymentId);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchPayments();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      alert('Server xatolik');
    }
    setProcessing(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard size={24} className="text-primary-600" />
            To&apos;lovlar
          </h1>
          <p className="text-text-secondary mt-1">Barcha to&apos;lovlar va ularning holatlari</p>
        </div>
        <button onClick={fetchPayments} className="btn-ghost flex items-center gap-2 self-start">
          <RefreshCw size={16} />
          Yangilash
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')}
          className={`card p-3 sm:p-4 text-center transition-all ${statusFilter === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`}
        >
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">{counts.pending}</p>
          <p className="text-xs text-text-secondary">Kutilmoqda</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? '' : 'CONFIRMED')}
          className={`card p-3 sm:p-4 text-center transition-all ${statusFilter === 'CONFIRMED' ? 'ring-2 ring-green-400' : ''}`}
        >
          <p className="text-xl sm:text-2xl font-bold text-green-600">{counts.confirmed}</p>
          <p className="text-xs text-text-secondary">Tasdiqlangan</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
          className={`card p-3 sm:p-4 text-center transition-all ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-400' : ''}`}
        >
          <p className="text-xl sm:text-2xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-xs text-text-secondary">Rad etilgan</p>
        </button>
      </div>

      {/* Payments list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div className="card p-12 text-center">
            <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="card p-12 text-center">
            <CreditCard size={48} className="text-text-secondary mx-auto mb-4 opacity-30" />
            <p className="text-text-secondary">To&apos;lovlar topilmadi</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {payment.user.image ? (
                        <img src={payment.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <User size={14} className="text-primary-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-text-primary text-sm">{payment.user.name || 'Nomsiz'}</p>
                        <p className="text-xs text-text-secondary">
                          {payment.user.telegramUsername ? `@${payment.user.telegramUsername}` : payment.user.email}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {getPlanLabel(payment.plan)} ({getDurationLabel(payment.duration)})
                    </span>
                    <span className="font-semibold text-text-primary">
                      {payment.amount.toLocaleString()} so&apos;m
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      {new Date(payment.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                    {payment.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(payment.id, 'confirm')}
                          disabled={processing === payment.id}
                          className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={12} className="inline mr-1" />
                          Tasdiqlash
                        </button>
                        <button
                          onClick={() => handleAction(payment.id, 'reject')}
                          disabled={processing === payment.id}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} className="inline mr-1" />
                          Rad etish
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Foydalanuvchi</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Tarif</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Summa</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Holat</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Sana</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border hover:bg-primary-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {payment.user.image ? (
                              <img src={payment.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                <User size={14} className="text-primary-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-text-primary text-sm">{payment.user.name || 'Nomsiz'}</p>
                              <p className="text-xs text-text-secondary">
                                {payment.user.telegramUsername ? `@${payment.user.telegramUsername}` : payment.user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getPlanLabel(payment.plan)} ({getDurationLabel(payment.duration)})
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">{payment.amount.toLocaleString()} so&apos;m</td>
                        <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {new Date(payment.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-6 py-4">
                          {payment.status === 'PENDING' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(payment.id, 'confirm')}
                                disabled={processing === payment.id}
                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                Tasdiqlash
                              </button>
                              <button
                                onClick={() => handleAction(payment.id, 'reject')}
                                disabled={processing === payment.id}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                Rad etish
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary">
                              {payment.confirmedBy?.name && `${payment.confirmedBy.name}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
