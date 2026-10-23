'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface Named { id: string; nameUz: string; nameRu: string; nameEn: string }
interface Offer { id: string; labelUz: string; labelRu: string; labelEn: string; untilDate: string | null; price: number }
export interface ProductPaymentDetails {
  id: string; status: string; amount: number; receiptPhoto: string | null;
  product: (Named & { offers: Offer[] }) | null; offer: Offer | null; subjects: Named[];
}

export default function PaymentProductDetails({ payment, processing, onConfirm }: {
  payment: ProductPaymentDetails; processing: boolean; onConfirm: (offerId: string) => void;
}) {
  const lang = useLocale(), t = useTranslations('checkout');
  const [offerId, setOfferId] = useState('');
  const nameKey = lang === 'ru' ? 'nameRu' : lang === 'en' ? 'nameEn' : 'nameUz';
  const labelKey = lang === 'ru' ? 'labelRu' : lang === 'en' ? 'labelEn' : 'labelUz';
  if (!payment.product) return null;
  const expired = payment.offer?.untilDate && new Date(payment.offer.untilDate) <= new Date();
  const offers = payment.product.offers.filter((o) => o.id !== payment.offer?.id && (!o.untilDate || new Date(o.untilDate) > new Date()));
  return <div className="mt-2 space-y-2 text-sm break-words">
    <p>{payment.product[nameKey]}{payment.subjects.length > 0 && ` — ${payment.subjects.map((s) => s[nameKey]).join(', ')}`}</p>
    <p>{t('offer')}: {payment.offer?.[labelKey]} · {t('frozenAmount')}: {payment.amount.toLocaleString()} {t('currency')}</p>
    {!payment.receiptPhoto && payment.status === 'PENDING' && <p className="text-text-secondary">{t('noReceipt')}</p>}
    {expired && payment.status === 'PENDING' && <div className="p-3 rounded-lg bg-amber-50 text-amber-900 space-y-2">
      <p>{t('expired')}</p>
      <p>{t('keepAmount')}</p>
      <label className="block">
        <span className="block mb-1">{t('selectOffer')}</span>
        <select value={offerId} onChange={(event) => setOfferId(event.target.value)} className="min-h-11 w-full max-w-full rounded-lg border p-2 bg-white">
          <option value="">{t('selectOffer')}</option>
          {offers.map((o) => <option key={o.id} value={o.id}>{o[labelKey]} — {o.price.toLocaleString()} {t('currency')}</option>)}
        </select>
      </label>
      <button type="button" disabled={!offerId || processing} onClick={() => onConfirm(offerId)} className="min-h-11 px-3 py-2 rounded-lg bg-green-100 text-green-800 disabled:opacity-50">{t('replaceOffer')}</button>
    </div>}
  </div>;
}
