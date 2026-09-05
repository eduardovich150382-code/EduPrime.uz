'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, Clock, Loader2, Lock, Play } from 'lucide-react';

export interface CoursePurchaseInfo {
  id: string;
  price: number;
  isFree: boolean;
  accessType: string;
  isEnrolled: boolean;
  hasAccess: boolean;
  pendingPayment: boolean;
}

interface Props {
  course: CoursePurchaseInfo;
  enrolling: boolean;
  onEnroll: () => void;
  /**
   * 'full' — sahifa ichidagi asosiy panel: xarid qadamlari (1-to'lov,
   * 2-kvitansiya, 3-tasdiqlash) va qulf sababi bilan.
   * 'sticky' — mobilda pastga yopishtiriladigan tor panel: faqat tugma/holat,
   * qo'shimcha matnsiz. Ikkalasi ham BIR XIL holat mantig'idan (enrolled →
   * hasAccess → pending → paid → boshqa tarif kerak) foydalanadi — xarid
   * oqimi ikki joyda farq qilmasligi kerak, faqat matn hajmi farqlanadi.
   */
  variant: 'full' | 'sticky';
}

// Hozirgi xarid mexanizmi — Telegram bot orqali kvitansiya yuklash va admin
// tasdiqlashi (Payment modeli). Bu komponent shu oqimni FAQAT taqdim etadi,
// mexanizmning o'zini o'zgartirmaydi (CLAUDE.md — Payment/Subscription
// mantig'iga tegilmaydi). Kelajakda avtomatik to'lov shlyuzi qo'shilganda
// FAQAT shu komponent (va uning ichidagi buy link'i) almashtiriladi —
// GET /api/courses/[id] javob shakli (price/accessType/pendingPayment)
// o'zgarishsiz qoladi.
export default function CoursePurchasePanel({ course, enrolling, onEnroll, variant }: Props) {
  const t = useTranslations('courseDetail');
  const compact = variant === 'sticky';

  const buyHref = `https://t.me/EduPrimeuzbot?start=buy_course_${course.id}`;

  if (course.isEnrolled) {
    if (compact) return null; // sticky panel enrolled bo'lgach umuman ko'rinmaydi (qarang CoursePurchaseStickyBar)
    return (
      <Link href={`/courses/${course.id}/learn`} className="btn-primary w-full flex items-center justify-center gap-2 min-h-11">
        <Play size={18} /> {t('startLearningButton')}
      </Link>
    );
  }

  if (course.hasAccess) {
    return (
      <button
        onClick={onEnroll}
        disabled={enrolling}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 min-h-11"
      >
        {enrolling ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        {course.isFree ? t('freeEnrollButton') : t('enrollButton')}
      </button>
    );
  }

  if (course.accessType === 'paid') {
    if (course.pendingPayment) {
      return (
        <div className={compact ? 'text-center' : 'text-center'}>
          <div className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold min-h-11">
            <Clock size={14} className="flex-shrink-0" /> {t('pendingBadge')}
          </div>
          {!compact && <p className="text-sm text-text-secondary mt-2">{t('pendingNote')}</p>}
        </div>
      );
    }

    return (
      <div className={compact ? '' : 'space-y-4'}>
        <a
          href={buyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full flex items-center justify-center gap-2 min-h-11"
        >
          {t('buyButton', { price: course.price.toLocaleString() })}
        </a>
        {!compact && (
          <ol className="space-y-1.5 text-xs text-text-secondary">
            <li className="flex gap-2"><span className="font-semibold text-primary-600">1.</span> {t('purchaseStep1')}</li>
            <li className="flex gap-2"><span className="font-semibold text-primary-600">2.</span> {t('purchaseStep2')}</li>
            <li className="flex gap-2"><span className="font-semibold text-primary-600">3.</span> {t('purchaseStep3')}</li>
          </ol>
        )}
      </div>
    );
  }

  // Premium/Ustoz/Premium+Ustoz tarifi talab qilinadi. Sticky panelda bu
  // holat kamdan-kam ko'rinadi (asosan kurslar 'free' yoki 'paid'), lekin
  // to'liq mos bo'lishi uchun ikkala variant ham qo'llab-quvvatlanadi.
  const accessLabelKey =
    course.accessType === 'premium'
      ? 'accessPremium'
      : course.accessType === 'teacher'
        ? 'accessTeacher'
        : 'accessPremiumTeacher';

  if (compact) {
    return (
      <Link href="/pricing" className="btn-primary w-full flex items-center justify-center gap-2 min-h-11">
        <Lock size={16} /> {t('pricingLink')}
      </Link>
    );
  }

  return (
    <div className="text-center">
      <Lock size={22} className="text-primary-400 mx-auto mb-2" />
      <p className="text-sm text-text-secondary mb-3">{t('accessRequiredNote', { access: t(accessLabelKey) })}</p>
      <Link href="/pricing" className="btn-primary inline-flex items-center gap-2 min-h-11">
        {t('pricingLink')}
      </Link>
    </div>
  );
}

// Mobilda BottomNav (`fixed bottom-0 h-14`) tagida qolib ketmasligi uchun
// bottom-14 — StartBar.tsx (build oqimi)dagi bilan bir xil naqsh. Faqat
// hali yozilmagan (isEnrolled=false) foydalanuvchiga ko'rinadi — yozilgach
// asosiy paneldagi "O'rganishni boshlash" tugmasi yetarli, alohida doimiy
// panel keraksiz bandlik yaratadi.
export function CoursePurchaseStickyBar({ course, enrolling, onEnroll }: Omit<Props, 'variant'>) {
  const t = useTranslations('courseDetail');

  if (course.isEnrolled) return null;

  return (
    <div className="md:hidden sticky bottom-14 inset-x-0 z-40 -mx-4 px-4 pt-3">
      <div className="card p-3 bg-surface/95 backdrop-blur border-primary-100 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {course.accessType === 'paid' && !course.hasAccess && !course.pendingPayment ? (
            <p className="text-base font-bold text-text-primary">{course.price.toLocaleString()} so&apos;m</p>
          ) : (
            <p className="text-sm font-semibold text-text-primary">
              {course.isFree ? t('freeEnrollButton') : t('enrollButton')}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 w-44">
          <CoursePurchasePanel course={course} enrolling={enrolling} onEnroll={onEnroll} variant="sticky" />
        </div>
      </div>
    </div>
  );
}
