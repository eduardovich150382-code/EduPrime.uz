'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Admin ro'yxatlari uchun sahifalash — Foydalanuvchilar sahifasidagi
// namuna (adminUsersPager matnlari) bilan bir xil ko'rinish.
export default function Pager({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (page: number) => void;
}) {
  const tp = useTranslations('adminUsersPager');
  if (totalPages <= 1) return null;
  const button = 'min-h-11 px-4 rounded-xl border border-border bg-white text-sm font-medium flex items-center gap-1 hover:bg-primary-50 disabled:opacity-40 disabled:hover:bg-white';
  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label={tp('prev')} className={button}>
        <ChevronLeft size={16} aria-hidden />
        <span className="hidden sm:inline">{tp('prev')}</span>
      </button>
      <div className="text-center text-sm text-text-secondary">
        <p className="font-medium text-text-primary">{tp('pageOf', { page, pages: totalPages })}</p>
        <p className="text-xs">{tp('range', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}</p>
      </div>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label={tp('next')} className={button}>
        <span className="hidden sm:inline">{tp('next')}</span>
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}
