'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, User,
  Loader2, RefreshCw, Download, TrendingUp, X, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, MessageSquare,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import PaymentProductDetails, { type ProductPaymentDetails } from '@/components/admin/PaymentProductDetails';
import SendMessageDialog, { type MessageRecipient, type MessageTemplate } from '@/components/admin/SendMessageDialog';
import { useTranslations } from 'next-intl';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { iconButtonClass } from '@/components/admin/AdminFields';
import { getDurationLabel, getPlanLabel, initialStatusFilter, type PaymentsTranslator } from '@/components/admin/payment-labels';

interface PaymentData extends ProductPaymentDetails {
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
    hasTelegram: boolean;
  };
  confirmedBy: {
    id: string;
    name: string | null;
  } | null;
}

type SortDirection = 'none' | 'asc' | 'desc';

function getStatusBadge(status: string, t: PaymentsTranslator) {
  switch (status) {
    case 'CONFIRMED':
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"><CheckCircle size={12} /> {t('status.confirmed')}</span>;
    case 'REJECTED':
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"><XCircle size={12} /> {t('status.rejected')}</span>;
    default:
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Clock size={12} /> {t('status.pending')}</span>;
  }
}

// useSearchParams Suspense chegarasini talab qiladi (aks holda Next 15 build xatosi).
export default function AdminPaymentsPage() {
  return <Suspense fallback={null}><AdminPaymentsContent /></Suspense>;
}

function AdminPaymentsContent() {
  const t = useTranslations('checkout');
  const tp = useTranslations('adminPayments');
  const tc = useTranslations('adminCommon');
  const tm = useTranslations('adminMessage');
  const searchParams = useSearchParams();
  const [includeUnreceipted, setIncludeUnreceipted] = useState(false);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  // Dashboard kartasi `?status=PENDING` bilan ochadi — shu boshlang'ich filtr.
  const [statusFilter, setStatusFilter] = useState(() => initialStatusFilter(searchParams.get('status')));
  const [rejectTarget, setRejectTarget] = useState<PaymentData | null>(null);
  const [amountSort, setAmountSort] = useState<SortDirection>('none');
  const [counts, setCounts] = useState({ pending: 0, confirmed: 0, rejected: 0 });
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{ user: MessageRecipient; template?: MessageTemplate } | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (includeUnreceipted) params.set('includeUnreceipted', '1');
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.payments) { setPayments(data.payments); setCounts(data.counts); }
    } catch (error) { console.error('Failed to fetch payments:', error); }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [statusFilter, includeUnreceipted]);

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

  const handleAction = async (paymentId: string, action: 'confirm' | 'reject', replacementOfferId?: string) => {
    setProcessing(paymentId);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action, ...(replacementOfferId ? { replacementOfferId } : {}) }),
      });
      if (res.ok) fetchPayments();
      else { const d = await res.json(); alert(d.error === 'EXPIRED_OFFER' ? t('expired') : d.error === 'INVALID_REPLACEMENT' ? t('invalidReplacement') : d.error || tc('error')); }
    } catch { alert(tc('serverError')); }
    setProcessing(null);
    setRejectTarget(null);
  };

  // CSV Export
  const exportCSV = () => {
    const header = `${tp('csvHeader')}\n`;
    const rows = payments.map(p =>
      `"${p.user.name || ''}","${p.user.telegramUsername || ''}","${getPlanLabel(p.plan, tp)}","${getDurationLabel(p.duration, tp)}",${p.amount},"${p.status}","${new Date(p.createdAt).toLocaleDateString('uz-UZ')}"`
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
      <BackButton className="mb-2 min-h-11" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard size={24} className="text-primary-600" />
            {tp('title')}
          </h1>
          <p className="text-text-secondary mt-1">{tp('subtitle')}</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={exportCSV} className="btn-ghost min-h-11 flex items-center gap-2 text-sm">
            <Download size={16} aria-hidden /> CSV
          </button>
          <button onClick={fetchPayments} className="btn-ghost min-h-11 flex items-center gap-2 text-sm">
            <RefreshCw size={16} aria-hidden /> {tc('refresh')}
          </button>
        </div>
      </motion.div>

      {/* Revenue + Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 col-span-2 sm:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <TrendingUp size={18} className="text-green-600 mb-1" />
          <p className="text-xl font-bold text-green-700">{totalRevenue.toLocaleString()} <span className="text-sm font-normal">{tp('currency')}</span></p>
          <p className="text-xs text-green-600">{tp('totalRevenue')}</p>
          <p className="text-xs text-text-secondary mt-1">{tp('thisMonth', { amount: thisMonthRevenue.toLocaleString() })}</p>
        </div>
        <button onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')}
          aria-pressed={statusFilter === 'PENDING'}
          className={`card p-3 text-center transition-all ${statusFilter === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`}>
          <p className="text-xl font-bold text-yellow-600">{counts.pending}</p>
          <p className="text-[10px] text-text-secondary">{tp('status.pending')}</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? '' : 'CONFIRMED')}
          aria-pressed={statusFilter === 'CONFIRMED'}
          className={`card p-3 text-center transition-all ${statusFilter === 'CONFIRMED' ? 'ring-2 ring-green-400' : ''}`}>
          <p className="text-xl font-bold text-green-600">{counts.confirmed}</p>
          <p className="text-[10px] text-text-secondary">{tp('status.confirmed')}</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
          aria-pressed={statusFilter === 'REJECTED'}
          className={`card p-3 text-center transition-all ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-400' : ''}`}>
          <p className="text-xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-[10px] text-text-secondary">{tp('rejectedCount')}</p>
        </button>
      </div>

      <label className="flex items-center gap-2 min-h-11 text-sm">
        <input type="checkbox" checked={includeUnreceipted} onChange={(event) => setIncludeUnreceipted(event.target.checked)} className="h-5 w-5" />
        {t('showUnreceipted')}
      </label>

      {/* Amount Sort Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">{tp('sort')}</span>
        <button
          onClick={cycleAmountSort}
          className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            amountSort !== 'none'
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-white border-border text-text-secondary hover:bg-gray-50'
          }`}
        >
          {getSortIcon()}
          {tp('amountSort')} {amountSort === 'asc' ? tp('ascending') : amountSort === 'desc' ? tp('descending') : ''}
        </button>
        {amountSort !== 'none' && (
          <button
            onClick={() => setAmountSort('none')}
            className="flex min-h-11 items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <X size={12} aria-hidden /> {tp('clearSort')}
          </button>
        )}
      </div>

      {/* Payments list — Mobile card layout */}
      {loading ? (
        <div className="card p-12 text-center"><Loader2 size={32} className="animate-spin text-primary-600 mx-auto" /></div>
      ) : sortedPayments.length === 0 ? (
        <div className="card p-12 text-center"><CreditCard size={48} className="text-text-secondary mx-auto mb-4 opacity-30" /><p className="text-text-secondary">{tp('empty')}</p></div>
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{payment.user.name || tc('unnamed')}</p>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${payment.user.hasTelegram ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-text-secondary'}`}>
                        {payment.user.hasTelegram ? tm('telegramLinked') : tm('telegramNotLinked')}
                      </span>
                    </div>
                    {getStatusBadge(payment.status, tp)}
                  </div>
                  <p className="text-xs text-text-secondary mb-2">
                    {payment.user.telegramUsername ? `@${payment.user.telegramUsername}` : payment.user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">{tp('amount', { amount: payment.amount.toLocaleString() })}</span>
                    {!payment.product && <span>{getPlanLabel(payment.plan, tp)} ({getDurationLabel(payment.duration, tp)})</span>}
                    <span>{new Date(payment.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                  <PaymentProductDetails payment={payment} processing={processing === payment.id} onConfirm={(offerId) => handleAction(payment.id, 'confirm', offerId)} />
                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {payment.receiptPhoto && (
                      <button
                        onClick={() => {
                          setReceiptLoading(true);
                          setViewingReceipt(payment.receiptPhoto);
                        }}
                        className="flex min-h-11 items-center gap-1 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={12} aria-hidden /> {tp('viewReceipt')}
                      </button>
                    )}
                    {payment.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleAction(payment.id, 'confirm')} disabled={processing === payment.id}
                          className="flex min-h-11 items-center gap-1 px-3 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50">
                          <CheckCircle size={12} aria-hidden /> {tp('confirm')}
                        </button>
                        <button onClick={() => setRejectTarget(payment)} disabled={processing === payment.id}
                          className="flex min-h-11 items-center gap-1 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                          <XCircle size={12} aria-hidden /> {tp('reject')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setMessageTarget({
                        user: { id: payment.user.id, name: payment.user.name, username: payment.user.telegramUsername, hasTelegram: payment.user.hasTelegram },
                        // "Chek yuborilmagan" to'lov — eng ko'p yoziladigan eslatma darhol tayyor tursin.
                        template: payment.status === 'PENDING' && !payment.receiptPhoto ? 'receipt' : undefined,
                      })}
                      className="flex items-center gap-1 min-h-11 px-3 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors">
                      <MessageSquare size={12} /> {tm('open')}
                    </button>
                    {payment.confirmedBy && payment.status !== 'PENDING' && (
                      <span className="text-[10px] text-text-secondary">
                        {tp('confirmedBy', { name: payment.confirmedBy.name ?? '—' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {messageTarget && (
        <SendMessageDialog open user={messageTarget.user} defaultTemplate={messageTarget.template} onClose={() => setMessageTarget(null)} />
      )}

      {rejectTarget && (
        <ConfirmDialog
          title={tp('rejectTitle')}
          body={tp('rejectBody', { name: rejectTarget.user.name || tc('unnamed'), amount: rejectTarget.amount.toLocaleString() })}
          confirmLabel={tp('reject')}
          busy={processing === rejectTarget.id}
          onConfirm={() => void handleAction(rejectTarget.id, 'reject')}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {/* Receipt Photo/PDF Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingReceipt(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-lg w-full max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <CreditCard size={18} className="text-primary-600" />
                {tp('receipt')}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={viewingReceipt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${iconButtonClass} hover:bg-gray-100 text-text-secondary hover:text-primary-600`}
                  title={tp('openInNewTab')}
                  aria-label={tp('openInNewTab')}
                >
                  <Download size={18} aria-hidden />
                </a>
                <button onClick={() => setViewingReceipt(null)} className={`${iconButtonClass} hover:bg-gray-100`} title={tc('close')} aria-label={tc('close')}>
                  <X size={20} aria-hidden />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[75vh] flex items-center justify-center bg-gray-50">
              {receiptLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <Loader2 size={32} className="animate-spin text-primary-600" />
                </div>
              )}
              {viewingReceipt.toLowerCase().endsWith('.pdf') || viewingReceipt.includes('/documents/') ? (
                <div className="w-full h-[70vh]">
                  <iframe
                    src={viewingReceipt}
                    className="w-full h-full rounded-lg border border-border"
                    title={tp('receipt')}
                    onLoad={() => setReceiptLoading(false)}
                  />
                </div>
              ) : (
                <img
                  src={viewingReceipt}
                  alt={tp('receipt')}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                  onLoad={() => setReceiptLoading(false)}
                  onError={() => setReceiptLoading(false)}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
