'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import UserPicker from '@/components/admin/UserPicker';
import { adminFetch, buttonClass, ErrorMessage, errorCode, fieldClass, Field } from '@/components/admin/AdminFields';
import { localName, type AdminUser, type LocalName } from '@/components/admin/product-types';

interface Category extends LocalName { id: string; subjects: (LocalName & { id: string })[] }
interface Permission {
  id: string; user: AdminUser; category: LocalName; subject: LocalName | null; expiresAt: string | null;
}

export default function PermissionsPage() {
  const t = useTranslations('adminProducts');
  const locale = useLocale();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const userId = user?.id;
  const reload = useCallback(async (signal?: AbortSignal) => {
    const data = await adminFetch<{ categories: Category[]; permissions: Permission[] }>(`/api/admin/permissions${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { signal });
    setCategories(data.categories); setPermissions(data.permissions);
  }, [userId]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    reload(controller.signal).catch((error) => { if (!controller.signal.aborted) setError(errorCode(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function grant() {
    if (!user) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      await adminFetch('/api/admin/permissions', { method: 'POST', body: JSON.stringify({ userId: user.id, categoryId, subjectId: subjectId || null, expiresAt: expiresAt || null }) });
      await reload(); setSaved(true);
    } catch (error) { setError(errorCode(error)); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError(''); setSaved(false);
    try { await adminFetch('/api/admin/permissions', { method: 'DELETE', body: JSON.stringify({ id }) }); await reload(); }
    catch (error) { setError(errorCode(error)); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-5xl space-y-4"><h1 className="text-2xl font-bold">{t('permissions')}</h1>
    <form className="card space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); void grant(); }}><fieldset className="space-y-4" disabled={busy}>
      <UserPicker value={user} onChange={(value) => { setUser(value); setSaved(false); }} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('category')}><select required className={fieldClass} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubjectId(''); setSaved(false); }}><option value="">{t('choose')}</option>{categories.map((c) => <option key={c.id} value={c.id}>{localName(c, locale)}</option>)}</select></Field>
        <Field label={t('subject')}><select className={fieldClass} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSaved(false); }}><option value="">{t('wholeCategory')}</option>{categories.find((c) => c.id === categoryId)?.subjects.map((s) => <option key={s.id} value={s.id}>{localName(s, locale)}</option>)}</select></Field>
        <Field label={t('expiresTashkent')}><input className={fieldClass} type="date" value={expiresAt} onChange={(e) => { setExpiresAt(e.target.value); setSaved(false); }} /></Field>
      </div>
      <p className="text-sm text-text-secondary">{t('emptyExpiryHelp')}</p>
      <button className="btn-primary min-h-11" type="submit" disabled={!user || !categoryId}>{busy ? t('saving') : t('grantPermission')}</button>
      {saved && <p role="status" className="text-green-700">{t('saved')}</p>}
    </fieldset></form>
    <ErrorMessage error={error} /><h2 className="font-semibold">{t('activePermissions')}</h2>
    {loading && <p role="status">{t('loading')}</p>}
    {!loading && !permissions.length && <p>{t('noPermissions')}</p>}
    {permissions.map((permission) => <div key={permission.id} className="card flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0 break-words"><p className="font-medium">{permission.user.name || permission.user.id}</p><p className="text-sm text-text-secondary">{permission.user.email || permission.user.telegramUsername}</p><p>{localName(permission.category, locale)} — {permission.subject ? localName(permission.subject, locale) : t('wholeCategory')}</p><p className="text-sm">{permission.expiresAt ? new Date(permission.expiresAt).toLocaleDateString(locale, { timeZone: 'Asia/Tashkent' }) : t('unlimited')}</p></div><button className={buttonClass} type="button" disabled={busy} onClick={() => void revoke(permission.id)}>{t('revoke')}</button></div>)}
  </div>;
}
