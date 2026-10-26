'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import OfferEditor from './OfferEditor';
import { adminFetch, buttonClass, ErrorMessage, errorCode, fieldClass, Field } from './AdminFields';
import { localName, type AdminProduct } from './product-types';

export default function ProductEditor({ product, onSaved }: { product: AdminProduct; onSaved: () => Promise<void> }) {
  const t = useTranslations('adminProducts');
  const locale = useLocale();
  const [form, setForm] = useState({ nameUz: product.nameUz, nameRu: product.nameRu, nameEn: product.nameEn, isOnSale: product.isOnSale, secondSubjectDiscountPct: String(product.secondSubjectDiscountPct), order: String(product.order),
    taglineUz: product.taglineUz ?? '', taglineRu: product.taglineRu ?? '', taglineEn: product.taglineEn ?? '',
    featuresUz: product.featuresUz.join('\n'), featuresRu: product.featuresRu.join('\n'), featuresEn: product.featuresEn.join('\n') });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const activeOffers = product.offers.filter((offer) => offer.isActive);
  async function save() {
    setBusy(true); setError('');
    try {
      // Afzalliklar textarea'da: har qator — bitta band.
      const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);
      await adminFetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, secondSubjectDiscountPct: Number(form.secondSubjectDiscountPct), order: Number(form.order),
        featuresUz: lines(form.featuresUz), featuresRu: lines(form.featuresRu), featuresEn: lines(form.featuresEn) }) });
      await onSaved();
    } catch (error) { setError(errorCode(error)); }
    finally { setBusy(false); }
  }
  return <details className="card min-w-0 p-4 sm:p-5">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">{localName(product, locale)} · {product.isOnSale ? t('onSale') : t('notOnSale')}</summary>
    <div className="mt-3 space-y-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">{(['Uz', 'Ru', 'En'] as const).map((lang) => <Field key={lang} label={`${t('name')} (${lang.toLowerCase()})`}><input className={fieldClass} required maxLength={200} value={form[`name${lang}`]} onChange={(e) => setForm({ ...form, [`name${lang}`]: e.target.value })} /></Field>)}</div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label={t('discount')}><input className={fieldClass} type="number" required min={0} max={100} step={1} value={form.secondSubjectDiscountPct} onChange={(e) => setForm({ ...form, secondSubjectDiscountPct: e.target.value })} /></Field><Field label={t('order')}><input className={fieldClass} type="number" required min={0} max={2147483647} step={1} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-3">{(['Uz', 'Ru', 'En'] as const).map((lang) => <Field key={lang} label={`${t('tagline')} (${lang.toLowerCase()})`}><input className={fieldClass} maxLength={120} value={form[`tagline${lang}`]} onChange={(e) => setForm({ ...form, [`tagline${lang}`]: e.target.value })} /></Field>)}</div>
          <div className="grid gap-3 sm:grid-cols-3">{(['Uz', 'Ru', 'En'] as const).map((lang) => <Field key={lang} label={`${t('features')} (${lang.toLowerCase()})`}><textarea className={`${fieldClass} min-h-28`} rows={4} value={form[`features${lang}`]} onChange={(e) => setForm({ ...form, [`features${lang}`]: e.target.value })} /></Field>)}</div>
          <p className="text-xs text-text-secondary">{t('featuresHelp')}</p>
          <label className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" role="switch" checked={form.isOnSale} onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })} />{t('onSale')}</label>
          <div className="rounded-lg bg-gray-50 p-3 text-sm"><p>{t('publishedTests', { count: product.publishedTestCount })}</p>
            {product.subjectRule === 'ONE' && product.subjects.map((subject) => <p key={subject.id}>{localName(subject, locale)}: {subject.publishedTestCount}{form.isOnSale && subject.publishedTestCount === 0 ? ` — ${t('noContent')}` : ''}</p>)}
          </div>
          {form.isOnSale && <div role="status" className="space-y-2 text-sm text-amber-800">
            {(product.publishedTestCount === 0 || (product.subjectRule === 'ONE' && (!product.subjects.length || product.subjects.some((s) => s.publishedTestCount === 0)))) && <p className="rounded-lg bg-amber-50 p-3">{t('emptyContentWarning')}</p>}
            {activeOffers.some((offer) => offer.price === 0) && <p className="rounded-lg bg-amber-50 p-3">{t('zeroPriceWarning')}</p>}
            {!activeOffers.length && <p className="rounded-lg bg-amber-50 p-3">{t('noActiveOffersWarning')}</p>}
          </div>}
          <ErrorMessage error={error} /><button type="submit" className="btn-primary min-h-11">{busy ? t('saving') : t('saveProduct')}</button>
        </fieldset>
      </form>
      <h2 className="font-semibold">{t('offers')}</h2>
      {activeOffers.length > 2 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('tooManyOffers')}</p>}
      {product.offers.map((offer) => <OfferEditor key={`${offer.id}:${JSON.stringify(offer)}`} productId={product.id} offer={offer} onSaved={onSaved} />)}
      {adding ? <OfferEditor productId={product.id} onCancel={() => setAdding(false)} onSaved={async () => { await onSaved(); setAdding(false); }} /> : <button type="button" className={buttonClass} onClick={() => setAdding(true)}>{t('addOffer')}</button>}
    </div>
  </details>;
}
