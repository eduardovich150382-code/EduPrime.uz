'use client';

import { ClipboardCopy, Download, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

/**
 * Chat orqali import — ikkinchi yo'lning butun UI si.
 *
 * `teacher/import/page.tsx` ga QO'SHILMADI: u allaqachon 800 satrdan oshgan
 * va bu panel unga hech qanday holat ulashmaydi — faqat `jobId` ni oladi.
 *
 * Nega bu yo'l bor: serverdagi Gemini yo'li Vercel'ning 60 s chegarasiga va
 * bepul kunlik kvotaga taqaladi. Bu yerda ikkalasi ham yo'q — ustoz savollarni
 * chatga o'zi tashlaydi, javobini esa shu yerga qaytaradi.
 */

/** Bir qismdagi savollar soni — server bilan bir xil standart. */
const CHUNK_SIZE = 50;

interface Problem {
  order: number;
  code: string;
}

interface ApplyResult {
  applied: number;
  skipped: number;
  problems: Problem[];
}

/** Yuklanadigan fayl chegarasi — chat javobi bir necha yuz kilobayt bo'ladi. */
const MAX_JSON_BYTES = 4 * 1024 * 1024;

export default function ImportChatMode({ jobId }: { jobId: string }) {
  const t = useTranslations('teacherImport');
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<'prompt' | 'questions' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Kursor — keyingi so'rov qayerdan davom etishi. `skip` EMAS: qo'llangan
  // savollar navbatdan chiqib ketadi va `skip` o'rtadagilarni jimgina tashlab
  // ketardi (serverdagi izohga qarang).
  const [cursor, setCursor] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [chunk, setChunk] = useState<string>('');

  const [json, setJson] = useState('');
  const [result, setResult] = useState<ApplyResult | null>(null);

  async function copy(text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setNote(message);
    } catch {
      // Maxfiy rejimda yoki HTTPS'siz clipboard ishlamaydi — matn baribir
      // ekranda turadi, ustoz uni qo'lda belgilay oladi.
      setError(t('chatErrorCopy'));
    }
  }

  async function copyPrompt(): Promise<void> {
    setBusy('prompt');
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/teacher/import/${jobId}/export?prompt=1`);
      if (!res.ok) throw new Error('prompt');
      await copy(await res.text(), t('chatCopiedPrompt'));
    } catch {
      setError(t('chatErrorLoad'));
    } finally {
      setBusy(null);
    }
  }

  async function loadChunk(): Promise<void> {
    setBusy('questions');
    setError(null);
    setNote(null);
    try {
      const after = cursor === null ? '' : `after=${cursor}&`;
      const res = await fetch(`/api/teacher/import/${jobId}/export?${after}size=${CHUNK_SIZE}`);
      if (!res.ok) throw new Error('export');

      const text = await res.text();
      const total = Number(res.headers.get('X-Import-Total'));
      const next = res.headers.get('X-Import-Next-After');

      setChunk(text);
      setRemaining(Number.isFinite(total) ? total : null);
      // Sarlavha kelmasa — bu oxirgi qism. Kursor O'ZGARMAY qoladi, shunda
      // qaytadan bosish o'sha qismni yana beradi (zarari yo'q).
      if (next !== null) setCursor(Number(next));

      const count = text ? text.split('\n### ').length : 0;
      if (count === 0) setNote(t('chatEmpty'));
      else await copy(text, t('chatCopiedQuestions', { count }));
    } catch {
      setError(t('chatErrorLoad'));
    } finally {
      setBusy(null);
    }
  }

  function download(): void {
    const url = URL.createObjectURL(new Blob([chunk], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'savollar.md';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function pickFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > MAX_JSON_BYTES) {
      setError(t('chatErrorJson'));
      return;
    }
    setJson(await file.text());
    setError(null);
  }

  async function apply(): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError(t('chatErrorJson'));
      return;
    }

    setBusy('apply');
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/teacher/import/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'apply');

      setResult(body as ApplyResult);
      // Qo'llangan savollar navbatdan chiqadi — qolgan hisobini yangilash uchun
      // kursor boshiga qaytariladi, aks holda ustoz allaqachon qo'llangan
      // qismni qayta ko'chirishga urinardi.
      setCursor(null);
      setJson('');
    } catch {
      setError(t('chatErrorApply'));
    } finally {
      setBusy(null);
    }
  }

  const button = 'min-h-11 inline-flex items-center justify-center gap-2 disabled:opacity-50';

  return (
    <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
      <p className="text-sm text-text-secondary break-words">{t('chatHint')}</p>

      {/* 1-qadam: ko'rsatma va savollar. Telefonda ustma-ust, keng ekranda yonma-yon. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => void copyPrompt()} disabled={busy !== null} className={`btn-secondary ${button}`}>
          {busy === 'prompt' ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCopy size={18} />}
          {t('chatCopyPrompt')}
        </button>

        <button type="button" onClick={() => void loadChunk()} disabled={busy !== null} className={`btn-primary ${button}`}>
          {busy === 'questions' ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCopy size={18} />}
          {cursor === null ? t('chatCopyQuestions') : t('chatNext', { count: CHUNK_SIZE })}
        </button>

        {chunk && (
          <button type="button" onClick={download} disabled={busy !== null} className={`btn-secondary ${button}`}>
            <Download size={18} />
            {t('chatDownload')}
          </button>
        )}
      </div>

      {remaining !== null && <p className="text-sm text-text-secondary">{t('chatRemaining', { count: remaining })}</p>}
      {note && <p className="text-sm text-text-primary break-words">{note}</p>}

      {/* 2-qadam: chatdan qaytgan JSON. */}
      <label className="block">
        <span className="text-sm font-medium text-text-primary">{t('chatPasteLabel')}</span>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={t('chatPastePlaceholder')}
          rows={6}
          className="mt-1 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className={`btn-secondary ${button}`}>
          <Upload size={18} />
          {t('chatUploadFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            // Ayni faylni qayta tanlash ham `onChange` ni chaqirsin.
            e.target.value = '';
          }}
        />

        <button type="button" onClick={() => void apply()} disabled={busy !== null || !json.trim()} className={`btn-primary ${button}`}>
          {busy === 'apply' && <Loader2 size={18} className="animate-spin" />}
          {busy === 'apply' ? t('chatApplying') : t('chatApply')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 break-words">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-text-primary">
            {t('chatResult', { applied: result.applied, skipped: result.skipped })}
          </p>
          {result.problems.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">{t('chatProblems')}</p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {result.problems.map((problem, index) => (
                  <li key={`${problem.order}-${problem.code}-${index}`} className="break-words">
                    {problem.code === 'ALREADY_PROCESSED'
                      ? t('chatProblemAlreadyProcessed', { order: problem.order })
                      : t('chatProblemLine', { order: problem.order, code: problem.code })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
