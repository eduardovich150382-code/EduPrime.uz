'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { tashkentDateInput } from '@/lib/product-offers';
import { adminFetch, buttonClass, ErrorMessage, errorCode, fieldClass, Field } from './AdminFields';
import type { AdminOffer } from './product-types';

export default function OfferEditor({ productId, offer, onSaved, onCancel }: { productId: string; offer?: AdminOffer; onSaved: () => Promise<void>; onCancel?: () => void }) {
  const t = useTranslations('adminProducts');
  const [form, setForm] = useState({
    labelUz: offer?.labelUz ?? '', labelRu: offer?.labelRu ?? '', labelEn: offer?.labelEn ?? '',
    durationMonths: String(offer?.durationMonths ?? 1), untilDate: offer?.untilDate ? tashkentDateInput(offer.untilDate) : '',
    price: String(offer?.price ?? 0), isActive: offer?.isActive ?? true, order: String(offer?.order ?? 0),
  });
  const [durationType, setDurationType] = useState(offer?.untilDate ? 'until' : 'months');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(deactivate = false) {
    setBusy(true); setError('');
    try {
      const url = `/api/admin/products/${productId}/offers${offer ? `/${offer.id}` : ''}`;
      await adminFetch(url, { method: deactivate ? 'DELETE' : offer ? 'PATCH' : 'POST', body: deactivate ? undefined : JSON.stringify({
        ...form, durationMonths: durationType === 'months' ? Number(form.durationMonths) : null,
        untilDate: durationType === 'until' ? form.untilDate : null, price: Number(form.price), order: Number(form.order),
      }) });
      await onSaved();
    } catch (error) { setError(errorCode(error)); }
    finally { setBusy(false); }
  }
  return <form className="space-y-3 rounded-xl border border-border p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <fieldset disabled={busy} className="space-y-3">
      <legend className="mb-2 font-medium">{offer ? t('editOffer') : t('newOffer')}</legend>
      <div className="grid gap-3 sm:grid-cols-3">{(['Uz', 'Ru', 'En'] as const).map((lang) => <Field key={lang} label={`${t('name')} (${lang.toLowerCase()})`}><input className={fieldClass} required maxLength={200} value={form[`label${lang}`]} onChange={(e) => setForm({ ...form, [`label${lang}`]: e.target.value })} /></Field>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('durationType')}><select className={fieldClass} value={durationType} onChange={(e) => setDurationType(e.target.value)}><option value="months">{t('months')}</option><option value="until">{t('until')}</option></select></Field>
        {durationType === 'months' ? <Field label={t('monthCount')}><input className={fieldClass} type="number" required min={1} max={1200} step={1} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} /></Field> : <Field label={t('untilTashkent')}><input className={fieldClass} type="date" required value={form.untilDate} onChange={(e) => setForm({ ...form, untilDate: e.target.value })} /></Field>}
        <Field label={t('price')}><input className={fieldClass} type="number" required min={0} max={2147483647} step={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        <Field label={t('order')}><input className={fieldClass} type="number" required min={0} max={2147483647} step={1} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
      </div>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />{t('active')}</label>
      <ErrorMessage error={error} />
      <div className="flex flex-wrap gap-2"><button className="btn-primary min-h-11" type="submit">{busy ? t('saving') : t('save')}</button>
        {offer?.isActive && <button className={buttonClass} type="button" onClick={() => void save(true)}>{t('deactivate')}</button>}
        {onCancel && <button type="button" className={buttonClass} onClick={onCancel}>{t('cancel')}</button>}
      </div>
    </fieldset>
  </form>;
}
