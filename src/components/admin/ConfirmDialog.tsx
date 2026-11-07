'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import ExamDialog from '@/components/test/ExamDialog';
import { buttonClass, dangerButtonClass } from './AdminFields';

// Admin uchun yagona tasdiq oynasi. ExamDialog fokus tuzog'i, Escape va fokusni
// qaytarishni beradi. "Ortga" birinchi turadi: ExamDialog birinchi tugmaga
// fokus beradi, shuning uchun tasodifiy Enter xavfli amalni bajarmaydi.
export default function ConfirmDialog({
  title, body, confirmLabel, danger = true, busy = false, onConfirm, onClose, children,
}: {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useTranslations('adminCommon');
  return (
    <ExamDialog title={title} onClose={() => { if (!busy) onClose(); }}>
      {body && <div className="mb-4 text-sm text-text-secondary break-words [overflow-wrap:anywhere]">{body}</div>}
      {children}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={onClose} className={`${buttonClass} w-full sm:w-auto`}>
          {t('back')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`${danger ? dangerButtonClass : `${buttonClass} bg-primary-600 text-white border-primary-600`} w-full sm:w-auto`}
        >
          {busy ? t('processing') : confirmLabel}
        </button>
      </div>
    </ExamDialog>
  );
}
