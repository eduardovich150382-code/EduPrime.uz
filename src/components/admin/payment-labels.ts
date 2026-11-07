import type { useTranslations } from 'next-intl';

// To'lovlar sahifasining boshlang'ich holat filtri URL'dan keladi
// (`/admin/payments?status=PENDING` — dashboard kartasi). Faqat ma'lum
// qiymatlar qabul qilinadi: noma'lum qiymat API'ga xom holda ketmasin.
export const PAYMENT_STATUS_FILTERS = ['PENDING', 'CONFIRMED', 'REJECTED'] as const;
export type PaymentStatusFilter = (typeof PAYMENT_STATUS_FILTERS)[number];

export function initialStatusFilter(value: string | null): PaymentStatusFilter | '' {
  return PAYMENT_STATUS_FILTERS.find((status) => status === value) ?? '';
}

export type PaymentsTranslator = ReturnType<typeof useTranslations<'adminPayments'>>;

export function getDurationLabel(d: string, t: PaymentsTranslator) {
  switch (d) {
    case 'ONE_MONTH': return t('duration.oneMonth');
    case 'THREE_MONTHS': return t('duration.threeMonths');
    case 'SIX_MONTHS': return t('duration.sixMonths');
    case 'ONE_YEAR': return t('duration.oneYear');
    default: return d;
  }
}

export function getPlanLabel(p: string, t: PaymentsTranslator) {
  return p === 'PREMIUM' ? t('plan.premium') : p === 'TEACHER_PLAN' ? t('plan.teacher') : p;
}
