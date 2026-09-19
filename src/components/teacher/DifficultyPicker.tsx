'use client';

import { useTranslations } from 'next-intl';
import { bandOf, valueOfBand, DEFAULT_BAND, type DifficultyBand } from '@/lib/question/difficulty';

interface DifficultyPickerProps {
  value: number | null;
  onChange: (value: number) => void;
}

// Kalitlar ataylab statik — next-intl dinamik kalitni tekshira olmaydi.
const BAND_LABEL_KEY = {
  easy: 'difficultyEasy',
  medium: 'difficultyMedium',
  hard: 'difficultyHard',
} as const;

const BANDS: DifficultyBand[] = ['easy', 'medium', 'hard'];

/**
 * Uch pog'onali qiyinlik tanlagichi — raqam ko'rsatilmaydi.
 *
 * MUHIM: `bandOf` faqat KO'RSATISH uchun ishlatiladi. Bazadagi 1 yoki 5 to'g'ri
 * pog'onada ko'rinadi, lekin ustoz tugmani bosmaguncha qiymat o'zgarmaydi —
 * shuning uchun komponent o'zi hech qachon `onChange` chaqirmaydi.
 */
export default function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  const t = useTranslations('teacherQuestionForm');
  const active = bandOf(value) ?? DEFAULT_BAND;

  return (
    <div>
      <label className="text-xs font-medium text-text-secondary block mb-1.5">{t('difficultyLabel')}</label>
      {/* Tegish maydoni >= 44px — auditoriyaning katta qismi telefonda */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('difficultyLabel')}>
        {BANDS.map((band) => {
          const isActive = band === active;
          return (
            <button
              key={band}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(valueOfBand(band))}
              className={`min-h-[44px] px-2 rounded-lg border text-sm font-medium transition-all ${
                isActive
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-border bg-white text-text-secondary hover:border-primary-200'
              }`}
            >
              {t(BAND_LABEL_KEY[band])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
