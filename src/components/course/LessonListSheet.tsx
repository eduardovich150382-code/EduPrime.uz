'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CourseCurriculum from './CourseCurriculum';
import type { SectionItem } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  sections: SectionItem[];
  currentLessonId: string | null;
  onSelect: (lessonId: string) => void;
}

/**
 * Mobilda dars ro'yxatiga bir bosishda kirish uchun pastdan chiquvchi panel.
 * lg va undan yuqorida ishlatilmaydi — o'sha o'lchamlarda doimiy yon panel bor.
 * BottomNav (`fixed bottom-0 h-14`) tagida qolib ketmasin deb bottom-14 qo'llanadi.
 */
export default function LessonListSheet({ open, onClose, courseId, sections, currentLessonId, onSelect }: Props) {
  const t = useTranslations('courseLearn');

  return (
    <AnimatePresence>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-14 md:bottom-0 max-h-[75vh] bg-surface rounded-t-2xl shadow-xl flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-text-primary text-sm">{t('lessonListTitle')}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="p-2.5 -m-2.5 rounded-lg hover:bg-gray-100 text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              <CourseCurriculum
                courseId={courseId}
                sections={sections}
                currentLessonId={currentLessonId}
                onSelect={(lessonId) => {
                  onSelect(lessonId);
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
