'use client';

import { useTranslations } from 'next-intl';
import { Clock, Loader2 } from 'lucide-react';
import { CLOCK_KEY_PREFIX, DRAFT_KEY_PREFIX } from '@/lib/test-draft';

interface ExpiredDraftNoticeProps {
  testId: string;
  answered: number;
  total: number;
  submitting: boolean;
  onSubmit: () => void;
}

// Brauzerda qayta aralashtirmaymiz: savollar tartibi submit bilan aynan mos
// kelishi shart, shuning uchun sahifa birinchi ochilishdagi oddiy yo'l bilan
// qayta yuklanadi. removeItem va reload bitta sinxron handler'da — oradan
// React render (va qoralamani qayta yozadigan effekt) o'tib ketolmaydi.
function restartFresh(testId: string) {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${testId}`);
    localStorage.removeItem(`${CLOCK_KEY_PREFIX}${testId}`);
  } catch { /* Storage yopiq bo'lsa qoralama ham tiklanmaydi — reload baribir toza boshlaydi. */ }
  window.location.reload();
}

// Sahifa ochilganda vaqti allaqachon tugagan urinish uchun tanlov ekrani.
// Asosiy tugma — yangidan boshlash: foydalanuvchi ko'pincha eski urinishni
// unutgan bo'ladi va yarim javobli natija uning statistikasini buzadi.
export default function ExpiredDraftNotice({ testId, answered, total, submitting, onSubmit }: ExpiredDraftNoticeProps) {
  const t = useTranslations('exam.expiredDraft');
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100">
        <Clock size={36} className="text-amber-700" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">{t('title')}</h2>
      <p className="mb-6 text-text-secondary">{t('body', { answered, total })}</p>
      <div className="flex flex-col gap-3">
        <button type="button" disabled={submitting} onClick={() => restartFresh(testId)} className="btn-primary min-h-11 w-full disabled:opacity-60">
          {t('restart')}
        </button>
        <button type="button" disabled={submitting} onClick={onSubmit} className="exam-control w-full">
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {t('submit')}
        </button>
      </div>
    </div>
  );
}
