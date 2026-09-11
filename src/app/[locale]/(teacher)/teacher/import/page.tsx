'use client';

import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ImportDebugPanel, {
  drawDiagnostics,
  type DebugPage,
} from '@/components/teacher/ImportDebugPanel';
import { Link, useRouter } from '@/i18n/routing';
import { MAX_IMPORT_PAGES } from '@/lib/import/constants';
import { loadPdf } from '@/lib/import/pdf-client';
import {
  TooManyPagesError,
  assertPageCount,
  markDuplicates,
  processPage,
  type CropResult,
  type ImportProgress,
  type PageResult,
} from '@/lib/import/run-import';

/**
 * Hujjatdan import — yuklash va quvurni haydash sahifasi.
 *
 * BUTUN OG'IR ISH BRAUZERDA: PDF o'qish, sahifani render qilish va
 * chizmalarni kesish shu yerda bajariladi. Serverga faqat natija (blok matni
 * va kesilgan PNG) ketadi — shuning uchun Vercel funksiyasining vaqt
 * chegarasi tegmaydi va server xarajati nolga tushadi.
 *
 * `?debug=1` — diagnostika rejimi: job yaratilmaydi, serverga hech narsa
 * yuborilmaydi va kvota sarflanmaydi (`components/teacher/ImportDebugPanel`).
 */

/** Manba PDF chegarasi — `importSource` endpointi bilan bir xil. */
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;

const SOURCE_LANGS = ['uz', 'ru', 'en'] as const;

interface Subject {
  id: string;
  nameUz: string;
}

interface JobState {
  jobId: string;
  pagesDone: number[];
}

type Phase = 'idle' | 'running' | 'done' | 'error';

export default function TeacherImportPage() {
  const t = useTranslations('teacherImport');
  const router = useRouter();
  const debug = useSearchParams().get('debug') === '1';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('uz');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [resumedCount, setResumedCount] = useState(0);
  const [summary, setSummary] = useState<{ blocks: number; figures: number } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [debugPages, setDebugPages] = useState<DebugPage[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  function pickFile(candidate: File | null | undefined): void {
    if (!candidate) return;
    setErrorText(null);
    if (candidate.type !== 'application/pdf') {
      setErrorText(t('errorNotPdf'));
      return;
    }
    // Hajm OLDINDAN tekshiriladi — 30 soniyalik yuklashdan keyin rad javobini
    // olish foydalanuvchi uchun eng yomon holat.
    if (candidate.size > MAX_SOURCE_BYTES) {
      setErrorText(t('errorTooLarge', { max: 32 }));
      return;
    }
    setFile(candidate);
    setPhase('idle');
    setSummary(null);
    setDebugPages([]);
  }

  // -------------------------------------------------------------------------
  // Serverga yuborish
  // -------------------------------------------------------------------------

  async function uploadSource(pdf: File): Promise<string> {
    const form = new FormData();
    form.set('file', pdf);
    const res = await fetch('/api/upload?endpoint=importSource', { method: 'POST', body: form });
    if (!res.ok) throw new Error('upload');
    return (await res.json()).url as string;
  }

  async function createJob(fileUrl: string, pageCount: number): Promise<JobState> {
    const res = await fetch('/api/teacher/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subjectId,
        fileName: file?.name ?? 'import.pdf',
        fileUrl,
        sourceLang,
        pageCount,
      }),
    });
    const data = await res.json();
    if (res.status === 429) {
      throw new Error(t('errorQuota', { used: data.usedToday ?? 0, limit: data.limit ?? 0 }));
    }
    if (!res.ok) throw new Error(data.error ?? t('errorGeneric'));
    return { jobId: data.jobId, pagesDone: data.pagesDone ?? [] };
  }

  async function sendCrop(id: string, crop: CropResult): Promise<void> {
    const form = new FormData();
    form.set('file', new File([crop.blob], `p${crop.page}.png`, { type: 'image/png' }));
    form.set('page', String(crop.page));
    form.set('bbox', JSON.stringify(crop.bbox));
    form.set('widthPx', String(crop.widthPx));
    form.set('heightPx', String(crop.heightPx));
    form.set('kind', crop.kind);
    // sha256 YUBORILMAYDI — serverning o'zi hisoblaydi.
    await fetch(`/api/teacher/import/${id}/assets`, { method: 'POST', body: form });
  }

  async function sendBlocks(id: string, result: PageResult): Promise<void> {
    await fetch(`/api/teacher/import/${id}/blocks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: result.page, blocks: result.blocks }),
    });
  }

  // -------------------------------------------------------------------------
  // Quvur
  // -------------------------------------------------------------------------

  async function run(): Promise<void> {
    if (!file) return;
    if (!debug && !subjectId) {
      setErrorText(t('errorNoSubject'));
      return;
    }

    setPhase('running');
    setErrorText(null);
    setDebugPages([]);
    setSummary(null);

    try {
      const pdf = await loadPdf(await file.arrayBuffer());
      const totalPages = assertPageCount(pdf);

      let job: JobState | null = null;
      if (!debug) {
        const fileUrl = await uploadSource(file).catch(() => {
          throw new Error(t('errorUpload'));
        });
        job = await createJob(fileUrl, totalPages);
        setJobId(job.jobId);
        setResumedCount(job.pagesDone.length);
      }

      const done = new Set(job?.pagesDone ?? []);
      const allCrops: CropResult[] = [];
      const collectedDebug: DebugPage[] = [];
      let blockCount = 0;

      for (let page = 1; page <= totalPages; page++) {
        // Qayta ulanishda tugagan sahifa butunlay o'tkazib yuboriladi —
        // eng qimmat qismi (render) ham qaytadan bajarilmasin.
        if (done.has(page)) continue;

        setProgress({ page, totalPages, stage: 'text' });
        const result = await processPage(pdf, page, {
          onStage: (stage) => setProgress({ page, totalPages, stage }),
          onCanvas: debug
            ? (canvas, pageResult) => {
                collectedDebug.push({
                  result: pageResult,
                  imageUrl: drawDiagnostics(canvas, pageResult).toDataURL('image/png'),
                });
              }
            : undefined,
        });

        blockCount += result.blocks.length;
        allCrops.push(...result.crops);

        if (job) {
          setProgress({ page, totalPages, stage: 'upload' });
          for (const crop of result.crops) await sendCrop(job.jobId, crop);
          await sendBlocks(job.jobId, result);
        }
      }

      // Takroriy grafikalar (logotip, kolontitul) faqat barcha sahifalar
      // ishlangach aniqlanadi — shuning uchun bu yerda.
      const { kept } = markDuplicates(allCrops, totalPages);

      setDebugPages(collectedDebug);
      setSummary({ blocks: blockCount, figures: kept.length });
      setProgress(null);
      setPhase('done');
    } catch (err) {
      setProgress(null);
      setPhase('error');
      if (err instanceof TooManyPagesError) {
        setErrorText(t('errorTooManyPages', { pages: err.pageCount, max: MAX_IMPORT_PAGES }));
      } else {
        setErrorText(err instanceof Error ? err.message : t('errorGeneric'));
      }
    }
  }

  const stageLabel = progress
    ? {
        text: t('stageText'),
        render: t('stageRender'),
        figures: t('stageFigures'),
        upload: t('stageUpload'),
      }[progress.stage]
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      <div className="card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-text-primary">{t('subject')}</span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-lg border border-border bg-background px-3"
            >
              <option value="">{t('subjectPlaceholder')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameUz}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text-primary">{t('sourceLang')}</span>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-lg border border-border bg-background px-3"
            >
              {SOURCE_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Fayl tashlash zonasi — tegish maydoni katta, telefonda ham bosiladi. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer?.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragging ? 'border-primary-600 bg-primary-50' : 'border-border'
          }`}
        >
          <Upload size={24} className="mx-auto text-primary-600" />
          <p className="mt-2 font-medium text-text-primary">{t('dropTitle')}</p>
          <p className="text-sm text-text-secondary">{t('dropHint')}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {file && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <FileText size={18} className="text-primary-600 shrink-0" />
            <span className="flex-1 text-sm text-text-primary truncate">{file.name}</span>
            <button
              type="button"
              aria-label={t('removeFile')}
              onClick={() => setFile(null)}
              className="p-2 rounded-lg hover:bg-primary-50 min-h-11 min-w-11 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {errorText && (
          <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-text-primary">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {resumedCount > 0 && phase === 'running' && (
          <p className="text-sm text-text-secondary">{t('resumed', { count: resumedCount })}</p>
        )}

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>{t('progress', { done: progress.page, total: progress.totalPages })}</span>
              <span>{stageLabel}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-primary-50 overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${(progress.page / progress.totalPages) * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'done' && summary && (
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              {t('done', { blocks: summary.blocks, figures: summary.figures })}
            </p>
            {jobId && !debug && (
              <Link href={`/teacher/import/${jobId}`} className="btn-primary inline-flex min-h-11 items-center">
                {t('openJob')}
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!file || phase === 'running'}
          onClick={() => {
            if (phase === 'done' && jobId && !debug) router.push(`/teacher/import/${jobId}`);
            else void run();
          }}
          className="btn-primary w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {phase === 'running' && <Loader2 size={18} className="animate-spin" />}
          {phase === 'running' ? t('starting') : debug ? t('debugRun') : t('start')}
        </button>
      </div>

      {debug && <ImportDebugPanel pages={debugPages} />}
    </div>
  );
}
