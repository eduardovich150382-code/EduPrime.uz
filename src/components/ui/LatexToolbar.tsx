'use client';

import { RefObject } from 'react';

interface Snippet {
  key: string;
  symbol: string;
  insert: string;
  cursorInside?: boolean;
}

const SNIPPETS: Snippet[] = [
  { key: 'kasr', symbol: 'a⁄b', insert: '\\frac{}{}', cursorInside: true },
  { key: 'ildiz', symbol: '√', insert: '\\sqrt{}', cursorInside: true },
  { key: 'daraja', symbol: 'xⁿ', insert: '^{}', cursorInside: true },
  { key: 'indeks', symbol: 'xₙ', insert: '_{}', cursorInside: true },
  { key: 'yigindi', symbol: '∑', insert: '\\sum_{}^{}', cursorInside: true },
  { key: 'integral', symbol: '∫', insert: '\\int_{}^{}', cursorInside: true },
  { key: 'limit', symbol: 'lim', insert: '\\lim_{}', cursorInside: true },
  { key: 'pi', symbol: 'π', insert: '\\pi' },
  { key: 'marta', symbol: '×', insert: '\\times' },
  { key: 'bolish', symbol: '÷', insert: '\\div' },
  { key: 'pm', symbol: '±', insert: '\\pm' },
  { key: 'le', symbol: '≤', insert: '\\le' },
  { key: 'ge', symbol: '≥', insert: '\\ge' },
  { key: 'neq', symbol: '≠', insert: '\\neq' },
  { key: 'to', symbol: '→', insert: '\\to' },
];

interface LatexToolbarProps {
  targetRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Matematik belgilarni bir bosishda kiritish uchun panel. Kursor allaqachon
 * ochiq $...$ formula ichida turgan bo'lsa, qo'shimcha $ qo'shmaydi — aks
 * holda belgini avtomatik $...$ ichiga oladi.
 */
export default function LatexToolbar({ targetRef, value, onChange, className = '' }: LatexToolbarProps) {
  const insert = (snippet: Snippet) => {
    const el = targetRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);

    const dollarsBefore = (before.match(/\$/g) || []).length;
    const insideFormula = dollarsBefore % 2 === 1;
    const body = snippet.insert;
    const wrapped = insideFormula ? body : `$${body}$`;

    onChange(before + wrapped + after);

    requestAnimationFrame(() => {
      el.focus();
      const openOffset = insideFormula ? 0 : 1;
      let caret = before.length + openOffset + body.length;
      if (snippet.cursorInside) {
        const braceIndex = body.indexOf('{}');
        if (braceIndex !== -1) caret = before.length + openOffset + braceIndex + 1;
      }
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {SNIPPETS.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => insert(s)}
          title={`$${s.insert}$`}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-white text-xs font-medium text-text-secondary hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          {s.symbol}
        </button>
      ))}
    </div>
  );
}
