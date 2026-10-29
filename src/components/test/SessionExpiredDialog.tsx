'use client';

import { useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { loginHref } from '@/lib/safe-return-path';
import ExamDialog from './ExamDialog';

// Topshirish 401 qaytarganda: javoblar localStorage qoralamasida turibdi,
// shuning uchun foydalanuvchini qo'rqitmay, kirgach aynan shu test sahifasiga
// qaytaramiz — u yerda qoralama tiklanadi va qayta topshirish mumkin.
// `returnPath` locale prefiksli bo'lishi shart (qarang `localizedPath`).
export default function SessionExpiredDialog({ returnPath, onClose }: { returnPath: string; onClose: () => void }) {
  const t = useTranslations('exam.sessionExpired');
  return (
    <ExamDialog title={t('title')} onClose={onClose}>
      <p role="alert" className="mb-6 text-sm leading-relaxed text-text-secondary">{t('body')}</p>
      <div className="flex flex-col gap-3">
        <Link href={loginHref(returnPath)} className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2">
          <LogIn size={18} aria-hidden="true" />
          {t('login')}
        </Link>
        <button type="button" onClick={onClose} className="exam-control w-full">{t('close')}</button>
      </div>
    </ExamDialog>
  );
}
