'use client';

import { useTranslations } from 'next-intl';
import { getQuestionSection, SECTION_KEYS, setQuestionSection, type SectionKey } from '@/lib/question-sections';

/**
 * Attestatsiya savolining bo'limi. Faqat `section:` tegini almashtiradi —
 * `tags` dagi boshqa teglar o'z joyida qoladi (`setQuestionSection`).
 * Test yaratish (QuestionEditorForm) va tahrirlash sahifasi ikkalasi ham
 * ishlatadi, shuning uchun alohida komponent.
 */
export default function SectionSelect({ tags, onChange }: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useTranslations('teacherQuestionForm');
  const names = useTranslations('questionSections');
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary block mb-1.5">
        {t('sectionLabel')}
        <select
          value={getQuestionSection(tags) ?? ''}
          onChange={(e) => onChange(setQuestionSection(tags, (e.target.value || null) as SectionKey | null))}
          className="mt-1.5 w-full min-h-11 px-3 py-2 rounded-lg border border-border bg-white text-sm text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
        >
          <option value="">{t('sectionNone')}</option>
          {SECTION_KEYS.map((key) => (
            <option key={key} value={key}>{names(key)}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
