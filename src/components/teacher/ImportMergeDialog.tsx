'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CopyCheck, Loader2, Plus, X } from 'lucide-react';

interface Props {
  open: boolean;
  /** "Almashtirish" nechta savolni o'chirishi — tugmaning O'ZIDA ko'rsatiladi. */
  existingCount: number;
  incomingCount: number;
  /** 0 bo'lsa ogohlantirish bloki ko'rsatilmaydi. */
  duplicateCount: number;
  /**
   * Saqlash yo'lda bo'lsa "Almashtirish" o'chiriladi.
   *
   * Sababi: `applyServerQuestionIds` server ID larini INDEKS bo'yicha
   * yopishtiradi. Ketayotgan saqlashning javobi qoralama almashtirilgandan
   * keyin kelsa, eski qatorlarning ID lari yangi savollarga tushib qolardi
   * va keyingi saqlash eski qatorlarni boshqa matn bilan ustidan yozardi.
   * "Qo'shish" da bunday xavf yo'q — mavjud indekslar o'z joyida qoladi.
   */
  replaceDisabled?: boolean;
  onAppend: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

/**
 * Import natijasi bo'sh bo'lmagan qoralamaga tushayotganda so'raladigan tanlov.
 *
 * Ilgari import qoralamani JIMGINA almashtirardi: 72 talik testni ikki
 * bo'lakda qo'ygan ustozning birinchi yarmi ogohlantirishsiz yo'qolardi.
 *
 * Buzuvchi amal STANDART EMAS: "Oxiriga qo'shish" birinchi va asosiy tugma,
 * "Almashtirish" esa nechta savol o'chishini o'z yorlig'ida aytadi.
 */
export default function ImportMergeDialog({
  open,
  existingCount,
  incomingCount,
  duplicateCount,
  replaceDisabled = false,
  onAppend,
  onReplace,
  onCancel,
}: Props) {
  const t = useTranslations('teacherImport');

  // Escape — bekor qilish. `DuplicateQuestionsDialog` da bu yo'q, lekin bu
  // yerda import natijasi kutib turibdi va chiqib ketish yo'li ochiq bo'lsin.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Plus size={18} className="text-primary-600" /> {t('mergeTitle')}
          </h3>
          <button
            onClick={onCancel}
            aria-label={t('mergeCancel')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary min-h-11 min-w-11 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-text-secondary break-words">
            {t('mergeBody', { existing: existingCount, incoming: incomingCount })}
          </p>

          {duplicateCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <CopyCheck size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 break-words">
                {t('mergeDuplicates', { count: duplicateCount })}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4 border-t border-border">
          <button onClick={onAppend} autoFocus className="btn-primary min-h-11">
            {t('mergeAppend')}
          </button>
          <button
            onClick={onReplace}
            disabled={replaceDisabled}
            className="btn-secondary min-h-11 !text-red-600 !border-red-200 hover:!bg-red-50 disabled:opacity-50"
          >
            {t('mergeReplace', { count: existingCount })}
          </button>
          {replaceDisabled && (
            <p className="text-xs text-text-secondary flex items-center justify-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> {t('mergeSaving')}
            </p>
          )}
          <button
            onClick={onCancel}
            className="min-h-11 rounded-xl text-sm text-text-secondary hover:bg-gray-100"
          >
            {t('mergeCancel')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
