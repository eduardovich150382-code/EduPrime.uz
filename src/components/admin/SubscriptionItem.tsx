'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ExamDialog from '@/components/test/ExamDialog';
import { adminFetch, buttonClass, ErrorMessage, errorCode } from '@/components/admin/AdminFields';
import { localName, type LocalName } from '@/components/admin/product-types';
import { subscriptionName } from '@/lib/subscription-display';
import type { SubscriptionPlan } from '@prisma/client';

export interface AdminSubscription {
  id: string; plan: SubscriptionPlan; endDate: string; startDate: string; isActive: boolean;
  product: LocalName | null; offer: { labelUz: string; labelRu: string; labelEn: string } | null;
  subjects: (LocalName & { id: string })[];
}

const LEGACY_PLANS: SubscriptionPlan[] = ['PREMIUM', 'TEACHER_PLAN'];
const date = (value: string, locale: string) => new Date(value).toLocaleDateString(locale, { timeZone: 'Asia/Tashkent' });

export default function SubscriptionItem({ sub, onChanged }: { sub: AdminSubscription; onChanged: () => Promise<void> }) {
  const t = useTranslations('adminProducts');
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = sub.isActive ? 'cancel' : 'restore';

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await adminFetch(`/api/admin/subscriptions/${encodeURIComponent(sub.id)}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      setConfirming(false);
      await onChanged();
    } catch (err) {
      setError(errorCode(err));
    } finally { setBusy(false); }
  };

  return <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere] rounded-lg bg-gray-50 p-3 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium">{localName(subscriptionName(sub), locale)}{sub.offer && ` — ${locale === 'ru' ? sub.offer.labelRu : locale === 'en' ? sub.offer.labelEn : sub.offer.labelUz}`}</p>
      {LEGACY_PLANS.includes(sub.plan) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{t('legacyBadge')}</span>}
      {!sub.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{t('cancelledBadge')}</span>}
    </div>
    <p>{sub.subjects.length ? sub.subjects.map((s) => localName(s, locale)).join(', ') : t(sub.plan === 'BUNDLE' ? 'allSubjects' : 'wholeCategory')}</p>
    <p>{date(sub.startDate, locale)} — {date(sub.endDate, locale)}</p>
    <button type="button" className={`${buttonClass} bg-white`} onClick={() => { setError(''); setConfirming(true); }}>
      {t(sub.isActive ? 'cancelSubscription' : 'restoreSubscription')}
    </button>
    {!confirming && <ErrorMessage error={error} />}
    {confirming && <ExamDialog title={t(sub.isActive ? 'cancelConfirmTitle' : 'restoreConfirmTitle')} onClose={() => { if (!busy) setConfirming(false); }}>
      <p className="mb-4 text-sm text-text-secondary">{t(sub.isActive ? 'cancelConfirmBody' : 'restoreConfirmBody', { name: localName(subscriptionName(sub), locale), date: date(sub.endDate, locale) })}</p>
      <ErrorMessage error={error} />
      {/* ExamDialog birinchi tugmaga fokus beradi — tasodifiy Enter bekor qilmasin. */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={`${buttonClass} w-full sm:w-auto`}>{t('back')}</button>
        <button type="button" disabled={busy} onClick={submit} className={`${buttonClass} ${sub.isActive ? 'bg-red-600 text-white' : 'bg-primary-600 text-white'} w-full sm:w-auto`}>
          {busy ? t('saving') : t(sub.isActive ? 'cancelSubscription' : 'restoreSubscription')}
        </button>
      </div>
    </ExamDialog>}
  </div>;
}
