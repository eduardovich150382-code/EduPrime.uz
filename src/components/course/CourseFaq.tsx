'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

const FAQ_KEYS = [1, 2, 3, 4] as const;

// S25 — statik savol-javob (barcha kurslar uchun bir xil matn, uz/ru/en).
// Kelajakda kursga xos FAQ kerak bo'lsa, bu yerga `course` prop qo'shib
// backend'dan kelgan ro'yxat bilan almashtiriladi — hozircha talab shunday
// emas.
export default function CourseFaq() {
  const t = useTranslations('courseDetail');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="font-semibold text-text-primary mb-4">{t('faqTitle')}</h2>
      <div className="space-y-2">
        {FAQ_KEYS.map((n) => {
          const isOpen = openIndex === n;
          return (
            <div key={n} className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : n)}
                className="w-full flex items-center justify-between gap-3 p-3.5 text-left min-h-11 hover:bg-primary-50/50 transition-colors"
              >
                <span className="text-sm font-medium text-text-primary">{t(`faq${n}Q`)}</span>
                <ChevronDown size={16} className={`flex-shrink-0 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 text-sm text-text-secondary border-t border-border pt-3">
                  {t(`faq${n}A`)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
