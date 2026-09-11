'use client';

import { AlertCircle, FileArchive, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import {
  IMPORT_SOURCE_LANGS,
  IMPORT_TARGET_LANGS,
  MAX_IMPORT_PAGES,
} from '@/lib/import/constants';
import { groupIntoQuestions, toUploadGroup } from '@/lib/import/grouping';
import type { Manifest, ManifestError } from '@/lib/import/manifest';
import {
  markPageDone,
  openManifestZip,
  sendGroups,
  uploadPageAssets,
  type ZipSource,
} from '@/lib/import/manifest-client';

/**
 * Hujjatdan import — PyMuPDF ZIP'ini yuklash sahifasi.
 *
 * PDF'ni ustoz kompyuterida skript o'qiydi (`Rasm_ajratgich.py` yoki
 * `scan_kesuvchi.py`), bu sahifa esa uning ZIP'ini BRAUZERDA ochadi:
 * manifestni tekshiradi, bloklarni butun hujjat bo'yicha savollarga guruhlaydi
 * (sof mantiq — lib/import/grouping.ts), rasmlarni sahifama-sahifa, savollarni
 * esa oxirida bir marta yuboradi. Serverga manifest, rasmlar va savol matni
 * ketadi — Vercel funksiyasi og'ir ishni bajarmaydi.
 */

/**
 * ZIP chegarasi. Server ZIP'ni ko'rmaydi (faqat manifest va rasmlar ketadi),
 * shuning uchun chegara — telefon xotirasi: 40 sahifa × 150 DPI PNG ≈ 40 MB.
 */
const MAX_ZIP_BYTES = 64 * 1024 * 1024;

const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed'];

interface Subject {
  id: string;
  nameUz: string;
}

interface Loaded {
  zip: ZipSource;
  manifest: Manifest;
  manifestBytes: Uint8Array;
}

interface Progress {
  done: number;
  total: number;
}

interface Summary {
  questions: number;
  images: number;
  skipped: number;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

export default function TeacherImportPage() {
  const t = useTranslations('teacherImport');
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('uz');
  const [targetLang, setTargetLang] = useState<string>('uz');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resumedCount, setResumedCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  // Reja manifestdan bir marta hisoblanadi — ko'rinadigan son va serverga
  // ketadigan `order` aynan bir xil manbadan chiqsin.
  const plan = useMemo(() => (loaded ? groupIntoQuestions(loaded.manifest) : null), [loaded]);
  const pages = useMemo(
    () => (loaded ? [...loaded.manifest.pages].sort((a, b) => a.page - b.page) : []),
    [loaded],
  );
  const counts = useMemo(
    () => ({
      questions: plan?.questions.length ?? 0,
      images: pages.reduce((sum, p) => sum + p.images.length, 0),
    }),
    [plan, pages],
  );

  function manifestErrorText(error: ManifestError): string {
    return t(`manifestError.${error.code}`, { detail: error.detail ?? '', max: MAX_IMPORT_PAGES });
  }

  function clearFile(): void {
    setFileName(null);
    setLoaded(null);
    setPhase('idle');
    setSummary(null);
  }

  async function pickFile(candidate: File | null | undefined): Promise<void> {
    if (!candidate) return;
    clearFile();
    setErrorText(null);
    // Windows brauzerlari ZIP'ni `application/x-zip-compressed` deb beradi,
    // ba'zi Android fayl menejerlari esa turini umuman bermaydi.
    const isZip = ZIP_TYPES.includes(candidate.type) || candidate.name.toLowerCase().endsWith('.zip');
    if (!isZip) {
      setErrorText(t('errorNotZip'));
      return;
    }
    if (candidate.size > MAX_ZIP_BYTES) {
      setErrorText(t('errorTooLarge', { max: MAX_ZIP_BYTES / 1024 / 1024 }));
      return;
    }

    const opened = openManifestZip(new Uint8Array(await candidate.arrayBuffer()));
    if ('error' in opened) {
      setErrorText(manifestErrorText(opened.error));
      return;
    }
    setFileName(candidate.name);
    setLoaded(opened);
    // Til manifestdan olinadi, lekin ustoz o'zgartira oladi — skriptda
    // `ASL_TIL` noto'g'ri qoldirilishi mumkin (scan skriptida shunday bo'lgan).
    setSourceLang(opened.manifest.sourceLang);
  }

  // -------------------------------------------------------------------------
  // Serverga yuborish
  // -------------------------------------------------------------------------

  async function uploadManifest(bytes: Uint8Array): Promise<string> {
    const form = new FormData();
    form.set(
      'file',
      new File([bytes as Uint8Array<ArrayBuffer>], 'manifest.json', { type: 'application/json' }),
    );
    const res = await fetch('/api/upload?endpoint=importSource', { method: 'POST', body: form });
    if (!res.ok) throw new Error('upload');
    return (await res.json()).url as string;
  }

  async function createJob(manifest: Manifest, fileUrl: string): Promise<{ jobId: string; pagesDone: number[] }> {
    const res = await fetch('/api/teacher/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subjectId,
        fileName: manifest.sourceFile,
        fileUrl,
        sourceLang,
        targetLang,
        pageCount: manifest.pageCount,
      }),
    });
    const data = await res.json();
    if (res.status === 429) {
      throw new Error(t('errorQuota', { used: data.usedToday ?? 0, limit: data.limit ?? 0 }));
    }
    if (!res.ok) throw new Error(data.error ?? t('errorGeneric'));
    return { jobId: data.jobId, pagesDone: data.pagesDone ?? [] };
  }

  // -------------------------------------------------------------------------
  // Quvur
  // -------------------------------------------------------------------------

  async function run(): Promise<void> {
    if (!loaded || !plan) return;
    if (!subjectId) {
      setErrorText(t('errorNoSubject'));
      return;
    }

    setPhase('running');
    setErrorText(null);
    setSummary(null);

    try {
      const fileUrl = await uploadManifest(loaded.manifestBytes).catch(() => {
        throw new Error(t('errorUpload'));
      });
      const job = await createJob(loaded.manifest, fileUrl);
      setJobId(job.jobId);
      setResumedCount(job.pagesDone.length);

      const done = new Set(job.pagesDone);
      const result: Summary = { questions: 0, images: 0, skipped: 0 };
      const assetIds = new Map<string, string>();
      const pageImages: { page: number; assetId: string }[] = [];
      // Tarmoq/server xatosi ustozga texnik kod ("assets 500") bo'lib
      // ko'rinmasin; sahifa `pagesDone` ga tushmagani uchun qayta urinish xavfsiz.
      const uploadError = () => {
        throw new Error(t('errorUpload'));
      };

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setProgress({ done: i + 1, total: pages.length });
        if (done.has(page.page)) continue;

        const sent = await uploadPageAssets(job.jobId, loaded.zip, page).catch(uploadError);
        sent.assetIds.forEach((id, file) => assetIds.set(file, id));
        if (sent.pageImageAssetId) pageImages.push({ page: page.page, assetId: sent.pageImageAssetId });
        result.images += sent.images;
        result.skipped += sent.skipped;
        await markPageDone(job.jobId, page.page).catch(uploadError);
      }

      // Savollar OXIRIDA, bir marta: savol sahifa chegarasidan o'tadi, uning
      // rasmlari esa keyingi sahifada bo'lishi mumkin. `order` — `plan` dagi
      // indeks, u manifestdan deterministik chiqadi.
      const groups = plan.questions.map((q, order) => toUploadGroup(q, order, assetIds));
      await sendGroups(job.jobId, { groups, pageImages }).catch(uploadError);
      result.questions = groups.length;

      setSummary(result);
      setProgress(null);
      setPhase('done');
    } catch (err) {
      setProgress(null);
      setPhase('error');
      setErrorText(err instanceof Error && err.message ? err.message : t('errorGeneric'));
    }
  }

  const selectClass = 'mt-1 w-full min-h-11 rounded-lg border border-border bg-background px-3';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      <div className="card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-text-primary">{t('subject')}</span>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectClass}>
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
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className={selectClass}>
              {IMPORT_SOURCE_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text-primary">{t('targetLang')}</span>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className={selectClass}>
              {IMPORT_TARGET_LANGS.map((lang) => (
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
            void pickFile(e.dataTransfer?.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragging ? 'border-primary-600 bg-primary-50' : 'border-border'
          }`}
        >
          <Upload size={24} className="mx-auto text-primary-600" />
          <p className="mt-2 font-medium text-text-primary">{t('dropTitle')}</p>
          <p className="text-sm text-text-secondary break-words">{t('dropHint')}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(e) => {
              void pickFile(e.target.files?.[0]);
              // Ayni faylni qayta tanlash ham `onChange` ni chaqirsin.
              e.target.value = '';
            }}
          />
        </div>

        {loaded && fileName && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <FileArchive size={18} className="text-primary-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{loaded.manifest.sourceFile}</p>
              <p className="text-xs text-text-secondary">
                {t('manifestSummary', {
                  pages: loaded.manifest.pageCount,
                  questions: counts.questions,
                  images: counts.images,
                })}
              </p>
              {loaded.manifest.kind === 'scanned' && (
                <p className="text-xs text-text-secondary">{t('manifestScanned')}</p>
              )}
            </div>
            <button
              type="button"
              aria-label={t('removeFile')}
              disabled={phase === 'running'}
              onClick={clearFile}
              className="p-2 rounded-lg hover:bg-primary-50 min-h-11 min-w-11 flex items-center justify-center disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {errorText && (
          <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-text-primary">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <span className="break-words min-w-0">{errorText}</span>
          </div>
        )}

        {resumedCount > 0 && phase === 'running' && (
          <p className="text-sm text-text-secondary">{t('resumed', { count: resumedCount })}</p>
        )}

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>{t('progress', { done: progress.done, total: progress.total })}</span>
              <span>{t('stageUpload')}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-primary-50 overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'done' && summary && (
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              {t('doneZip', { questions: summary.questions, images: summary.images })}
            </p>
            {summary.skipped > 0 && (
              <p className="text-sm text-text-secondary">{t('skippedImages', { count: summary.skipped })}</p>
            )}
            {jobId && (
              <Link href={`/teacher/import/${jobId}`} className="btn-primary inline-flex min-h-11 items-center">
                {t('openJob')}
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!loaded || phase === 'running'}
          onClick={() => {
            if (phase === 'done' && jobId) router.push(`/teacher/import/${jobId}`);
            else void run();
          }}
          className="btn-primary w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {phase === 'running' && <Loader2 size={18} className="animate-spin" />}
          {phase === 'running' ? t('starting') : t('start')}
        </button>
      </div>
    </div>
  );
}
