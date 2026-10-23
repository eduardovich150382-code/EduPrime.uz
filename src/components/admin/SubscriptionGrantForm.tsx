'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import UserPicker from './UserPicker';
import { adminFetch, ErrorMessage, errorCode, fieldClass, Field } from './AdminFields';
import { localName, offerName, type AdminProduct, type AdminUser } from './product-types';

export default function SubscriptionGrantForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const t = useTranslations('adminProducts');
  const locale = useLocale();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { adminFetch<{ products: AdminProduct[] }>('/api/admin/products').then((data) => setProducts(data.products)).catch((error) => setError(errorCode(error))); }, []);
  const product = products.find((p) => p.id === productId);
  const needsSubject = product?.kind === 'CATEGORY' && product.subjectRule !== 'NONE';
  const dtm = product?.subjectRule === 'DTM_BLOCK';
  const mandatory = product?.subjects.filter((s) => s.isMandatory) ?? [];
  const mainSubjects = product?.subjects.filter((s) => !dtm || !s.isMandatory) ?? [];
  async function save() {
    if (!user) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      await adminFetch('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify({ userId: user.id, productId, offerId, subjectIds: chosen }) });
      await onSaved(); setSaved(true);
    } catch (error) { setError(errorCode(error)); }
    finally { setBusy(false); }
  }
  return <form className="card space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <h2 className="font-semibold">{t('grantSubscription')}</h2>
    <fieldset className="space-y-4" disabled={busy}>
      <UserPicker value={user} onChange={(value) => { setUser(value); setSaved(false); }} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('product')}><select required className={fieldClass} value={productId} onChange={(e) => { setProductId(e.target.value); setOfferId(''); setChosen([]); setSaved(false); }}><option value="">{t('choose')}</option>{products.map((p) => <option key={p.id} value={p.id}>{localName(p, locale)}{p.isOnSale ? '' : ` (${t('notOnSale')})`}</option>)}</select></Field>
        <Field label={t('offer')}><select required className={fieldClass} value={offerId} onChange={(e) => { setOfferId(e.target.value); setSaved(false); }}><option value="">{t('choose')}</option>{product?.offers.filter((offer) => offer.isActive).map((offer) => <option key={offer.id} value={offer.id}>{offerName(offer, locale)} — {t('sum', { price: offer.price.toLocaleString() })}</option>)}</select></Field>
      </div>
      {needsSubject && !dtm && <Field label={t('subject')}><select required className={fieldClass} value={chosen[0] || ''} onChange={(e) => { setChosen([e.target.value]); setSaved(false); }}><option value="">{t('choose')}</option>{mainSubjects.map((s) => <option key={s.id} value={s.id}>{localName(s, locale)}</option>)}</select></Field>}
      {dtm && <div className="space-y-2"><p>{t('chooseTwoMain')}</p><div className="grid gap-2 sm:grid-cols-2">{mainSubjects.map((s) => <label className="flex min-h-11 items-center gap-3" key={s.id}><input type="checkbox" className="h-5 w-5" checked={chosen.includes(s.id)} disabled={!chosen.includes(s.id) && chosen.length >= 2} onChange={(e) => { setChosen(e.target.checked ? [...chosen, s.id] : chosen.filter((id) => id !== s.id)); setSaved(false); }} />{localName(s, locale)}</label>)}</div><p className="rounded-lg bg-blue-50 p-3 text-sm">{t('mandatoryAuto')}: {mandatory.map((s) => localName(s, locale)).join(', ') || '—'}</p>{mandatory.length !== 3 && <ErrorMessage error="MANDATORY_SUBJECTS_NOT_CONFIGURED" />}</div>}
      <p className="text-sm text-text-secondary">{t('renewalHelp')}</p>
      <ErrorMessage error={error} />
      {saved && <p role="status" className="text-green-700">{t('saved')}</p>}
      <button type="submit" className="btn-primary min-h-11" disabled={!user || !product || !offerId || (needsSubject && chosen.length !== (dtm ? 2 : 1)) || (dtm && mandatory.length !== 3)}>{busy ? t('saving') : t('grantSubscription')}</button>
    </fieldset>
  </form>;
}
