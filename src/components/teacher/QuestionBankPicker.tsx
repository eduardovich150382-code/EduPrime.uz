'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Library, Loader2, Search, X } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import type { BankQuestionChoice } from '@/lib/question/bank-selection';

export default function QuestionBankPicker({ subjectId, onAdd, onClose }: {
  subjectId: string;
  onAdd: (questions: BankQuestionChoice[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations('questionBankPicker');
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [questions, setQuestions] = useState<BankQuestionChoice[]>([]);
  const [selected, setSelected] = useState(new Set<string>());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => { const modal = dialog.current; modal?.showModal(); return () => modal?.close(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setSelected(new Set());
    const params = new URLSearchParams();
    if (subjectId) params.set('subjectId', subjectId);
    fetch(`/api/teacher/question-bank?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('BANK_LOAD_FAILED');
        return await response.json() as { questions?: BankQuestionChoice[] };
      })
      .then((data) => { if (!controller.signal.aborted) setQuestions(data.questions ?? []); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [subjectId, retry]);

  const needle = search.trim().toLocaleLowerCase();
  const visible = questions.filter((q) => `${q.text} ${q.topic ?? ''}`.toLocaleLowerCase().includes(needle));
  const allVisibleSelected = visible.length > 0 && visible.every((q) => selected.has(q.id));
  // Qidiruv o'zgarsa ham tanlanganlar saqlanadi; qo'shishda baza tartibi qoladi.
  const chosen = questions.filter((q) => selected.has(q.id));
  const toggle = (id: string) => setSelected((previous) => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });

  return (
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-2xl max-h-[90dvh] rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/50">
      <div className="flex max-h-[90dvh] flex-col bg-white text-text-primary">
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <h3 id={titleId} className="flex min-w-0 items-center gap-2 font-semibold"><Library size={18} className="shrink-0 text-primary-600" />{t('title')}</h3>
          <button type="button" onClick={onClose} aria-label={t('close')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="space-y-2 border-b border-border px-4 py-2">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3">
            <Search size={16} className="shrink-0" />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search')} aria-label={t('search')} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
          </label>
          {!loading && !error && <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={allVisibleSelected} disabled={visible.length === 0}
              onChange={() => setSelected((previous) => {
                const next = new Set(previous); for (const question of visible) { if (allVisibleSelected) next.delete(question.id); else next.add(question.id); } return next;
              })} />{t('selectVisible', { count: visible.length })}
          </label>}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" aria-label={t('loading')} /></div>
            : error ? <div role="alert" className="space-y-2 text-sm"><p>{t('error')}</p><button type="button" className="btn-secondary min-h-11" onClick={() => setRetry((value) => value + 1)}>{t('retry')}</button></div>
              : visible.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">{t('empty')}</p>
                : visible.map((question) => <label key={question.id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.has(question.id) ? 'border-primary-500 bg-primary-50' : 'border-border'}`}>
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={selected.has(question.id)} onChange={() => toggle(question.id)} aria-label={t('selectOne', { text: question.text.slice(0, 80) })} />
                  <div className="min-w-0 flex-1 overflow-x-auto text-sm"><span className="text-xs text-text-secondary">{question.topic}</span><LatexRenderer content={question.text} /></div>
                </label>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
          <span className="text-sm" aria-live="polite">{t('selected', { count: chosen.length })}</span>
          <button type="button" disabled={loading || error || chosen.length === 0} onClick={() => onAdd(chosen)} className="btn-primary min-h-11 disabled:opacity-50">{t('add', { count: chosen.length })}</button>
        </div>
      </div>
    </dialog>
  );
}
