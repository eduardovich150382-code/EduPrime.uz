'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { adminFetch, buttonClass, ErrorMessage, errorCode, fieldClass, Field } from './AdminFields';
import type { AdminUser } from './product-types';

export default function UserPicker({ value, onChange }: { value: AdminUser | null; onChange: (user: AdminUser | null) => void }) {
  const t = useTranslations('adminProducts');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (value || !query.trim()) { setUsers([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = await adminFetch<{ users: AdminUser[] }>(`/api/admin/permissions?search=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!controller.signal.aborted) setUsers(data.users);
      } catch (error) { if (!controller.signal.aborted) setError(errorCode(error)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value]);
  return <div className="space-y-2">
    <Field label={t('userSearch')}><input className={fieldClass} maxLength={100} value={value ? `${value.name || value.id} — ${value.email || value.telegramUsername || ''}` : query} onChange={(e) => { onChange(null); setQuery(e.target.value); }} /></Field>
    {value && <button type="button" className={buttonClass} onClick={() => { onChange(null); setQuery(''); }}>{t('changeUser')}</button>}
    <ErrorMessage error={error} />
    {loading && <p role="status">{t('loading')}</p>}
    {!value && users.map((user) => <button type="button" key={user.id} className={`${buttonClass} block w-full text-left break-words`} onClick={() => { onChange(user); setUsers([]); }}>{user.name || user.id} — {user.email || user.telegramUsername}</button>)}
    {!value && query.trim() && !loading && !users.length && <p className="text-sm text-text-secondary">{t('noUsers')}</p>}
  </div>;
}
