'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2 } from 'lucide-react';

interface Selection {
  selected: Set<string>;
  busy: boolean;
  toggle: (id: string) => void;
}
const SelectionContext = createContext<Selection | null>(null);

export function BankQuestionCheckbox({ id, text }: { id: string; text: string }) {
  const selection = useContext(SelectionContext);
  const t = useTranslations('questionBankBulk');
  if (!selection) return null;
  return (
    <label className="flex h-11 w-11 shrink-0 items-center justify-center cursor-pointer">
      <input type="checkbox" className="h-5 w-5 accent-primary-600"
        checked={selection.selected.has(id)} disabled={selection.busy}
        onChange={() => selection.toggle(id)} aria-label={t('selectOne', { text: text.slice(0, 80) })} />
    </label>
  );
}

export default function QuestionBankBulkDelete({ questions, onDeleted, children }: {
  questions: { id: string }[];
  onDeleted: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('questionBankBulk');
  const [selected, setSelected] = useState(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const visible = new Set(questions.map((q) => q.id));
  const ids = [...selected].filter((id) => visible.has(id));
  const allSelected = questions.length > 0 && ids.length === questions.length;
  const toggle = (id: string) => setSelected((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  async function remove() {
    if (busy || ids.length === 0 || !confirm(t('confirm', { count: ids.length }))) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch('/api/teacher/question-bank/delete-selected', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('DELETE_FAILED');
      const result = await response.json() as { count: number };
      alert(t('deleted', { count: result.count }));
      setSelected(new Set());
      onDeleted();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SelectionContext.Provider value={{ selected, busy, toggle }}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
        <label className="flex min-h-11 items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="h-5 w-5 accent-primary-600" checked={allSelected} disabled={busy}
            onChange={() => setSelected(allSelected ? new Set() : new Set(visible))} />
          {t('selectVisible', { count: questions.length })}
        </label>
        <button type="button" onClick={() => void remove()} disabled={busy || ids.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm text-red-700 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          {t('remove', { count: ids.length })}
        </button>
        {error && <p role="alert" className="w-full text-sm text-red-700">{t('error')}</p>}
      </div>
      {children}
    </SelectionContext.Provider>
  );
}
