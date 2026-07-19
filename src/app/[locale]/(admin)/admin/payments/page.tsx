'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, User,
  Loader2, RefreshCw, Download, TrendingUp, X, Eye,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

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

type SortDirection = 'none' | 'asc' | 'desc';

function getStatusBadge(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"><CheckCircle size={12} /> Tasdiqlangan</span>;
    case 'REJECTED':
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"><XCircle size={12} /> Rad</span>;
    default:
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Clock size={12} /> Kutilmoqda</span>;
  }
}

function getDurationLabel(d: string) {
  switch (d) {
    case 'ONE_MONTH': return '1 oy';
    case 'THREE_MONTHS': return '3 oy';
    case 'SIX_MONTHS': return '6 oy';
    case 'ONE_YEAR': return '1 yil';
    default: return d;
  }
}

function getPlanLabel(p: string) {
  return p === 'PREMIUM' ? 'Premium' : p === 'TEACHER_PLAN' ? 'Ustoz' : p;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [amountSort, setAmountSort] = useState<SortDirection>('none');
  const [counts, setCounts] = useState({ pending: 0, confirmed: 0, rejected: 0 });
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.payments) { setPayments(data.payments); setCounts(data.counts); }
    } catch (error) { console.error('Failed to fetch payments:', error); }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

  // Sort payments by amount
  const sortedPayments = [...payments].sort((a, b) => {
    if (amountSort === 'asc') return a.amount - b.amount;
    if (amountSort === 'desc') return b.amount - a.amount;
    return 0; // default: no sort (by date from API)
  });

  const cycleAmountSort = () => {
    if (amountSort === 'none') setAmountSort('desc');
    else if (amountSort === 'desc') setAmountSort('asc');
    else setAmountSort('none');
  };

  const handleAction = async (paymentId: string, action: 'confirm' | 'reject') => {
    setProcessing(paymentId);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      if (res.ok) fetchPayments();
      else { const d = await res.json(); alert(d.error || 'Xatolik'); }
    } catch { alert('Server xatolik'); }
    setProcessing(null);
  };

  // CSV Export
  const exportCSV = () => {
    const header = 'Ism,Telegram,Tarif,Muddat,Summa,Holat,Sana\n';
    const rows = payments.map(p =>
      `"${p.user.name || ''}","${p.user.telegramUsername || ''}","${getPlanLabel(p.plan)}","${getDurationLabel(p.duration)}",${p.amount},"${p.status}","${new Date(p.createdAt).toLocaleDateString('uz-UZ')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tolovlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Revenue stats
  const totalRevenue = payments.filter(p => p.status === 'CONFIRMED').reduce((sum, p) => sum + p.amount, 0);
  const thisMonthRevenue = payments.filter(p => {
    if (p.status !== 'CONFIRMED') return false;
    const d = new Date(p.confirmedAt || p.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + p.amount, 0);

  const getSortIcon = () => {
    if (amountSort === 'asc') return <ArrowUp size={14} />;
    if (amountSort === 'desc') return <ArrowDown size={14} />;
    return <ArrowUpDown size={14} />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard size={24} className="text-primary-600" />
            To&apos;lovlar
          </h1>
          <p className="text-text-secondary mt-1">Barcha to&apos;lovlar va daromad statistikasi</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={16} /> CSV
          </button>
          <button onClick={fetchPayments} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={16} /> Yangilash
          </button>
        </div>
      </motion.div>

      {/* Revenue + Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 col-span-2 sm:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <TrendingUp size={18} className="text-green-600 mb-1" />
          <p className="text-xl font-bold text-green-700">{totalRevenue.toLocaleString()} <span className="text-sm font-normal">so&apos;m</span></p>
          <p className="text-xs text-green-600">Jami daromad (tasdiqlangan)</p>
          <p className="text-xs text-text-secondary mt-1">Bu oy: {thisMonthRevenue.toLocaleString()} so&apos;m</p>
        </div>
        <button onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')}
          className={`card p-3 text-center transition-all ${statusFilter === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`}>
          <p className="text-xl font-bold text-yellow-600">{counts.pending}</p>
          <p className="text-[10px] text-text-secondary">Kutilmoqda</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? '' : 'CONFIRMED')}
          className={`card p-3 text-center transition-all ${statusFilter === 'CONFIRMED' ? 'ring-2 ring-green-400' : ''}`}>
          <p className="text-xl font-bold text-green-600">{counts.confirmed}</p>
          <p className="text-[10px] text-text-secondary">Tasdiqlangan</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
          className={`card p-3 text-center transition-all ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-400' : ''}`}>
          <p className="text-xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-[10px] text-text-secondary">Rad etilgan</p>
        </button>
      </div>

      {/* Amount Sort Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">Saralash:</span>
        <button
          onClick={cycleAmountSort}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            amountSort !== 'none'
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-white border-border text-text-secondary hover:bg-gray-50'
          }`}
        >
          {getSortIcon()}
          Summa {amountSort === 'asc' ? '(kichik→katta)' : amountSort === 'desc' ? '(katta→kichik)' : ''}
        </button>
        {amountSort !== 'none' && (
          <button
            onClick={() => setAmountSort('none')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <X size={12} /> Tozalash
          </button>
        )}
      </div>

      {/* Payments list — Mobile card layout */}
      {loading ? (
        <div className="card p-12 text-center"><Loader2 size={32} className="animate-spin text-primary-600 mx-auto" /></div>
      ) : sortedPayments.length === 0 ? (
        <div className="card p-12 text-center"><CreditCard size={48} className="text-text-secondary mx-auto mb-4 opacity-30" /><p className="text-text-secondary">To&apos;lovlar topilmadi</p></div>
      ) : (
        <div className="space-y-3">
          {sortedPayments.map((payment) => (
            <div key={payment.id} className="card p-4">
              <div className="flex items-start gap-3">
                {/* User */}
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {payment.user.image ? (
                    <img src={payment.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-primary-600" />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-text-primary text-sm truncate">{payment.user.name || 'Nomsiz'}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-xs text-text-secondary mb-2">
                    {payment.user.telegramUsername ? `@${payment.user.telegramUsername}` : payment.user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">{payment.amount.toLocaleString()} so&apos;m</span>
                    <span>{getPlanLabel(payment.plan)} ({getDurationLabel(payment.duration)})</span>
                    <span>{new Date(payment.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    {payment.receiptPhoto && (
                      <button
                        onClick={() => {
                          setReceiptLoading(true);
                          setViewingReceipt(payment.receiptPhoto);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={12} /> Chekni ko&apos;rish
                      </button>
                    )}
                    {payment.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleAction(payment.id, 'confirm')} disabled={processing === payment.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50">
                          <CheckCircle size={12} /> Tasdiqlash
                        </button>
                        <button onClick={() => handleAction(payment.id, 'reject')} disabled={processing === payment.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50">
                          <XCircle size={12} /> Rad
                        </button>
                      </>
                    )}
                    {payment.confirmedBy && payment.status !== 'PENDING' && (
                      <span className="text-[10px] text-text-secondary">
                        {payment.confirmedBy.name} tomonidan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipt Photo Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingReceipt(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-lg w-full max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <CreditCard size={18} className="text-primary-600" />
                To&apos;lov cheki
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={viewingReceipt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-primary-600 transition-colors"
                  title="Yangi tabda ochish"
                >
                  <Download size={18} />
                </a>
                <button onClick={() => setViewingReceipt(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[75vh] flex items-center justify-center bg-gray-50">
              {receiptLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <Loader2 size={32} className="animate-spin text-primary-600" />
                </div>
              )}
              <img
                src={viewingReceipt}
                alt="To'lov cheki"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                onLoad={() => setReceiptLoading(false)}
                onError={() => setReceiptLoading(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
