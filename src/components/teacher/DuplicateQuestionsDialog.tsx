'use client';

import { motion } from 'framer-motion';
import { CopyCheck, X } from 'lucide-react';
import type { DuplicateGroup } from '@/lib/duplicate-questions';

interface Props {
  open: boolean;
  /** `findDuplicateQuestions` natijasi — bo'sh bo'lsa modal ochilmaydi. */
  groups: DuplicateGroup[];
  /** Nechta ortiqcha nusxa tashlanishi — tugma yorlig'ida ko'rsatiladi. */
  extras: number;
  onDropDuplicates: () => void;
  onKeepAll: () => void;
  onCancel: () => void;
}

/** Ro'yxatda o'rinlar 1 dan sanaladi — ustoz ekranda shunday ko'radi. */
function positions(indexes: number[]): string {
  return indexes.map((i) => `#${i + 1}`).join(', ');
}

/** Uzun savol matni modalni cho'zib yubormasin. */
function preview(key: string): string {
  return key.length > 80 ? `${key.slice(0, 80)}…` : key;
}

/**
 * Saqlashdan oldin bir xil matnli savollar haqida ogohlantiradi.
 *
 * ATAYLAB jim emas: ustoz o'xshash savolni ataylab yozgan bo'lishi mumkin,
 * shuning uchun takrorni tashlash — taklif, avtomatik amal emas. Uchala
 * tanlov ham ochiq turadi.
 *
 * Test yaratish va tahrirlash sahifalari o'rtasida qayta ishlatiladi —
 * ikkalasi ham 900+ qator, modalni ularning ichiga yozish faylni yana
 * kattalashtirardi.
 */
export default function DuplicateQuestionsDialog({
  open,
  groups,
  extras,
  onDropDuplicates,
  onKeepAll,
  onCancel,
}: Props) {
  if (!open || groups.length === 0) return null;

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
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <CopyCheck size={18} className="text-amber-600" /> Bir xil savollar topildi
          </h3>
          <button
            onClick={onCancel}
            aria-label="Yopish"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary min-h-11 min-w-11 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-text-secondary break-words">
            Qoralamada {groups.length} ta savol matni takrorlanmoqda — jami {extras} ta ortiqcha
            nusxa. Ataylab shunday qilgan bo&apos;lsangiz, hammasini saqlashingiz mumkin.
          </p>
          {groups.map((group) => (
            <div key={group.key} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-text-primary break-words">{preview(group.key)}</p>
              <p className="text-xs text-amber-700 mt-1">
                O&apos;rinlari: {positions(group.indexes)} ({group.indexes.length} marta)
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 p-4 border-t border-border">
          <button onClick={onDropDuplicates} className="btn-primary flex-1 min-h-11">
            Takrorlarni tashlab saqlash ({extras} ta o&apos;chadi)
          </button>
          <button onClick={onKeepAll} className="btn-secondary flex-1 min-h-11">
            Hammasini saqlash
          </button>
          <button
            onClick={onCancel}
            className="flex-1 min-h-11 rounded-xl text-sm text-text-secondary hover:bg-gray-100"
          >
            Bekor qilish
          </button>
        </div>
      </motion.div>
    </div>
  );
}
