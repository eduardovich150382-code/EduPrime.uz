'use client';

import { useMemo, useRef, useState } from 'react';
import { Bold, Code, EyeOff, Italic, Link2, Loader2, Quote, RotateCcw, Save, Send, Strikethrough, Underline } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { renderTemplate, type TemplateVars } from '@/lib/campaign/texts';
import { telegramVisibleLength, validateTelegramHtml, type HtmlIssue } from '@/lib/telegram-html';
import TelegramPreview from './TelegramPreview';

// Telegram HTML matn muharriri. ATAYLAB aksiyaga bog'lanmagan: o'zgaruvchilar,
// namunaviy qiymatlar va chegara props bilan keladi — A4 kanal postlari ham
// shu komponentni ishlatadi. Emoji oddiy matn (nusxa olish yoki Win + .).

export type EditorVariable = { name: string; hint: string };
export type EditorMessage = { tone: 'ok' | 'error'; text: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  variables: EditorVariable[];
  sampleVars: TemplateVars;
  maxLength: number;
  /** Alert kabi HTML'siz chiqadigan matn — oldindan ko'rish formatlashsiz. */
  plain?: boolean;
  /** Server qaytargan xatolar (saqlashda). */
  serverIssues?: HtmlIssue[];
  busy?: 'save' | 'test' | 'reset' | null;
  message?: EditorMessage | null;
  onSave: () => void;
  onTest: () => void;
  /** Berilmasa "Standartga qaytarish" tugmasi ko'rinmaydi. */
  onReset?: () => void;
};

const FORMATS = [
  { label: 'Qalin', icon: Bold, open: '<b>', close: '</b>' },
  { label: 'Kursiv', icon: Italic, open: '<i>', close: '</i>' },
  { label: 'Tagiga chizilgan', icon: Underline, open: '<u>', close: '</u>' },
  { label: "O'chirilgan", icon: Strikethrough, open: '<s>', close: '</s>' },
  { label: 'Spoiler', icon: EyeOff, open: '<tg-spoiler>', close: '</tg-spoiler>' },
  { label: 'Iqtibos', icon: Quote, open: '<blockquote>', close: '</blockquote>' },
  { label: 'Kod', icon: Code, open: '<code>', close: '</code>' },
] as const;

const VARIABLE_RE = /\{(\w+)\}/g;
const toolButton = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-white text-text-secondary hover:bg-primary-50 disabled:opacity-50';

function unknownIssues(text: string, known: Set<string>): HtmlIssue[] {
  const issues: HtmlIssue[] = [];
  const seen = new Set<string>();
  text.split('\n').forEach((line, index) => {
    for (const [, name] of line.matchAll(VARIABLE_RE)) {
      if (known.has(name) || seen.has(name)) continue;
      seen.add(name);
      issues.push({ line: index + 1, message: `Noma'lum o'zgaruvchi {${name}}` });
    }
  });
  return issues;
}

export default function TelegramHtmlEditor({
  value, onChange, variables, sampleVars, maxLength, plain = false, serverIssues = [], busy = null, message = null, onSave, onTest, onReset,
}: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const known = useMemo(() => new Set(variables.map((v) => v.name)), [variables]);
  const rendered = useMemo(() => renderTemplate(value, sampleVars), [value, sampleVars]);
  // Hisob render qilingandan keyin, teglarsiz — Telegram chegarani shunday sanaydi.
  const length = useMemo(() => telegramVisibleLength(rendered), [rendered]);
  const issues = useMemo(
    () => [...unknownIssues(value, known), ...validateTelegramHtml(value)].sort((a, b) => a.line - b.line),
    [value, known],
  );
  const tooLong = length > maxLength;
  const invalid = tooLong || issues.length > 0;

  /** Belgilangan matnni o'raydi; belgilanmagan bo'lsa bo'sh teg qo'yib kursorni ichiga qo'yadi. */
  const insert = (open: string, close = '') => {
    const el = area.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    onChange(value.slice(0, start) + open + selected + close + value.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      if (selected) el.setSelectionRange(start, start + open.length + selected.length + close.length);
      else el.setSelectionRange(start + open.length, start + open.length);
    });
  };

  const insertLink = () => {
    const url = window.prompt('Havola manzili (https://, http:// yoki tg://)', 'https://');
    if (!url?.trim()) return;
    insert(`<a href="${url.trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`, '</a>');
  };

  const allIssues = [...issues, ...serverIssues.filter((s) => !issues.some((i) => i.line === s.line && i.message === s.message))];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Formatlash">
          {FORMATS.map(({ label, icon: Icon, open, close }) => (
            <button key={label} type="button" title={label} aria-label={label} className={toolButton} onClick={() => insert(open, close)} disabled={plain}>
              <Icon size={18} aria-hidden />
            </button>
          ))}
          <button type="button" title="Havola" aria-label="Havola" className={toolButton} onClick={insertLink} disabled={plain}>
            <Link2 size={18} aria-hidden />
          </button>
        </div>

        <textarea
          ref={area}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm leading-relaxed text-text-primary"
          aria-label="Xabar matni"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={tooLong ? 'font-semibold text-red-600' : 'text-text-secondary'}>
            {length} / {maxLength} belgi{plain ? ' (teglarsiz)' : ''}
          </span>
        </div>

        {allIssues.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">
            {allIssues.map((issue, index) => (
              <li key={index} className="wrap-break-word">{issue.line > 0 ? `${issue.line}-qator: ` : ''}{issue.message}</li>
            ))}
          </ul>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">O&apos;zgaruvchilar — bosilsa kursor joyiga qo&apos;yiladi</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button key={v.name} type="button" onClick={() => insert(`{${v.name}}`)} title={v.hint}
                className="min-h-11 rounded-lg border border-border bg-white px-2.5 py-1 text-left text-xs hover:bg-primary-50">
                <span className="font-mono font-semibold text-primary-700">{`{${v.name}}`}</span>
                <span className="block text-[11px] text-text-secondary">{v.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onSave} disabled={invalid || busy !== null}
            className="btn-primary flex min-h-11 items-center justify-center gap-2 py-2.5! text-sm disabled:opacity-50">
            {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
          </button>
          <button type="button" onClick={onTest} disabled={busy !== null || !value.trim()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50">
            {busy === 'test' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} O&apos;zimga sinov
          </button>
          {onReset && (
            <button type="button" onClick={() => setConfirmReset(true)} disabled={busy !== null}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm text-text-secondary hover:bg-gray-50 disabled:opacity-50">
              <RotateCcw size={16} /> Standartga qaytarish
            </button>
          )}
        </div>
        {message && (
          <p role="status" className={`text-sm wrap-break-word ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-medium text-text-secondary">Oldindan ko&apos;rish (namunaviy qiymatlar bilan)</p>
        <TelegramPreview html={rendered} plain={plain} />
      </div>

      {confirmReset && onReset && (
        <ConfirmDialog
          title="Standartga qaytarish"
          body="O'zgartirilgan matn o'chadi va standart matn ishlatiladi."
          confirmLabel="Qaytarish"
          busy={busy === 'reset'}
          onClose={() => setConfirmReset(false)}
          onConfirm={() => { setConfirmReset(false); onReset(); }}
        />
      )}
    </div>
  );
}
