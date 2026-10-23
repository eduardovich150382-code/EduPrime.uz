'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { adminFetch, ErrorMessage, errorCode } from '@/components/admin/AdminFields';
import { localName, type LocalName } from '@/components/admin/product-types';

interface Subject extends LocalName { id: string; isMandatory: boolean; category: LocalName & { type: string } }

export default function SubjectsPage() {
  const t = useTranslations('adminProducts');
  const locale = useLocale();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => { setSubjects((await adminFetch<{ subjects: Subject[] }>('/api/admin/subjects')).subjects); }, []);
  useEffect(() => { reload().catch((error) => setError(errorCode(error))).finally(() => setLoading(false)); }, [reload]);
  async function toggle(subject: Subject) {
    setBusy(subject.id); setError('');
    try { await adminFetch('/api/admin/subjects', { method: 'PATCH', body: JSON.stringify({ id: subject.id, isMandatory: !subject.isMandatory }) }); await reload(); }
    catch (error) { setError(errorCode(error)); }
    finally { setBusy(''); }
  }
  return <div className="mx-auto max-w-4xl space-y-4"><h1 className="text-2xl font-bold">{t('subjects')}</h1><p className="text-sm text-text-secondary">{t('mandatoryHelp')}</p><ErrorMessage error={error} />
    {loading ? <p role="status">{t('loading')}</p> : subjects.map((subject) => <div key={subject.id} className="card flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{localName(subject, locale)}</p><p className="text-sm text-text-secondary">{localName(subject.category, locale)}</p></div>{subject.category.type === 'DTM' && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={subject.isMandatory} disabled={Boolean(busy)} onChange={() => void toggle(subject)} />{t('mandatorySubject')}</label>}</div>)}
  </div>;
}
