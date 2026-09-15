'use client';

import { AlertCircle, FileArchive, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import ImportChatMode from '@/components/teacher/ImportChatMode';
import { Link, useRouter } from '@/i18n/routing';
import {
  IMPORT_SOURCE_LANGS,
  IMPORT_TARGET_LANGS,
  MAX_IMPORT_PAGES,
} from '@/lib/import/constants';
import { findAnswerKeys } from '@/lib/import/answer-key';
import { flattenBlocks, groupIntoQuestions, toUploadGroup } from '@/lib/import/grouping';
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

/**
 * Tugallanmagan import — brauzer yopilib qayta ochilsa davom ettirish uchun.
 * Faqat `jobId` saqlanadi: qolgan hamma narsa serverda.
 */
const STORAGE_KEY = 'eduprime.import.job';

/**
 * Ustoz tanlagan yo'l — avtomatik yoki chat.
 *
 * Faqat KLIENTDA saqlanadi: `ImportJob` da bu uchun ustun yo'q va kerak ham
 * emas — tanlov ikkala marshrutning ishiga umuman ta'sir qilmaydi, u shunchaki
 * qaysi panel ko'rinishini hal qiladi.
 */
const MODE_KEY = 'eduprime.import.mode';

type Mode = 'auto' | 'chat';

/** Struktura so'rovi yiqilsa shuncha kutib qayta uriniladi. */
const RETRY_DELAYS = [1000, 3000];

/**
 * Struktura sikli shuncha marta ilgarilamasa to'xtaydi.
 *
 * Server yiqilgan blokni uch marta qayta uringach terminal qilib belgilaydi,
 * ya'ni `done` bir necha aylanma davomida o'zgarmasligi MUMKIN. To'rtinchi
 * turgan aylanmada esa nimadir buzilgan — cheksiz aylanmaslik kerak.
 */
const MAX_STALLED_ROUNDS = 4;

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

/** Progress qaysi bosqichni ko'rsatayotgani — quvurning uch bosqichi. */
type Stage = 'upload' | 'structure' | 'translate';

/** Bosqich yorlig'ining tarjima kaliti. */
const STAGE_LABEL: Record<Stage, string> = {
  upload: 'stageUpload',
  structure: 'stageStructure',
  translate: 'stageTranslate',
};

function rememberJob(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Maxfiy rejimda yozib bo'lmaydi — davom ettirish imkoni yo'qoladi, xolos.
  }
}

function forgetJob(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // yuqoridagi sabab
  }
}

function readJob(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'chat' ? 'chat' : 'auto';
  } catch {
    return 'auto';
  }
}

function rememberMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Maxfiy rejimda yozib bo'lmaydi — tanlov keyingi tashrifda esda qolmaydi, xolos.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server bitta ham blok yoza olmadi.
 *
 * Alohida sinf: bu xatoning matni ustozga TUSHUNARLI va uni umumiy
 * "uzildi" xabari bilan almashtirmaslik kerak.
 */
class StructureStalledError extends Error {}

/**
 * Gemini kunlik kvotasi tugadi.
 *
 * `StructureStalledError` dan MEROS: sikl uchun bu ham "davom etishning
 * ma'nosi yo'q" holati va xabari o'z matni bilan ko'rsatiladi — farqi faqat
 * matnda, chunki ustozning qiladigan ishi boshqa: kutish, qayta urinish emas.
 */
class QuotaError extends StructureStalledError {}

/**
 * Marshrut qaytaradigan yiqilish sababi — faqat konsolga chiqadi.
 *
 * `lib/import/structure-error.ts` dagi `LastError` bilan bir xil shakl, lekin
 * import qilinmaydi: bu klient uchun tarmoqdan kelgan JSON, server turi emas.
 */
interface StepError {
  message: string;
  name?: string;
  status?: number;
  causeName?: string;
  causeMessage?: string;
  at?: string;
}

interface StructureStep {
  done: number;
  total: number;
  hasMore: boolean;
  /** Vaqt yetmagani uchun keyingi so'rovga qoldirilgan bloklar soni. */
  deferred?: number;
  /** Shu paketda yiqilgan bloklar soni. */
  failed?: number;
  /** Birinchi uchta yiqilishning sababi — faqat konsol uchun. */
  failedSample?: { order: number; message: string }[];
  /** Marshrut necha ms ishlagani — vaqt byudjetini sozlash uchun o'lchov. */
  elapsedMs?: number;
  /** Shu so'rovda nechta to'lqin ulgurgani. */
  batches?: number;
  /** Muddat tugagani uchun qolgan bloklarga tegilmadimi. */
  deadlineHit?: boolean;
  /** Bitta ham blok yozilmadi — sikl davom etsa bekorga aylanadi. */
  stalled?: boolean;
  /** Kvota tugagani uchun qoldirilgan bloklar soni. */
  rateLimited?: number;
  /** Uch urinishdan keyin terminal yiqilgan bloklar soni. */
  stuck?: number;
  /** Paketdagi oxirgi yiqilish sababi — `deferred` bloklar uchun ham. */
  lastError?: StepError;
}

/**
 * Struktura paketining diagnostikasi konsolga chiqadi, ekranga EMAS.
 *
 * Ustozga "17-blok 429 bilan yiqildi" degan xabarning foydasi yo'q — u
 * baribir hech narsa qilolmaydi. Xato sababi esa ishlab chiquvchiga kerak,
 * shuning uchun brauzer konsolida qoladi (server tomonida u Sentry'ga ham
 * tushadi).
 */
function logStructureStep(step: StructureStep): void {
  if (typeof step.elapsedMs === 'number') {
    // `deferred`, `rateLimited`, `stuck` va sabab ham shu satrda: usiz "hech
    // narsa yozilmadi" holatining sababi konsolda umuman ko'rinmas va uni
    // faqat bazaga so'rov yuborib topish mumkin edi.
    console.info(
      '[import] structure elapsedMs',
      step.elapsedMs,
      `${step.done}/${step.total}`,
      `batches=${step.batches ?? '?'}`,
      `deadlineHit=${step.deadlineHit ?? false}`,
      `deferred=${step.deferred ?? 0}`,
      `rateLimited=${step.rateLimited ?? 0}`,
      `stuck=${step.stuck ?? 0}`,
    );
  }
  if (step.lastError) console.warn('[import] structure lastError', step.lastError);
  if (step.failed) {
    console.warn('[import] structure failed', step.failed, step.failedSample ?? []);
  }
}

/**
 * Struktura so'rovi — tarmoq uzilishiga chidamli.
 *
 * Ikki marta qayta uriniladi (1 s, 3 s): marshrut idempotent, shuning uchun
 * qayta urinish xavfsiz — yozilgan savol qayta to'lanmaydi.
 */
async function postStructure(jobId: string, retryFailed = false): Promise<StructureStep> {
  let lastError: unknown = null;
  const query = retryFailed ? '?retryFailed=1' : '';
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await wait(RETRY_DELAYS[attempt - 1]);
    try {
      const res = await fetch(`/api/teacher/import/${jobId}/structure${query}`, { method: 'POST' });
      if (!res.ok) throw new Error(`structure ${res.status}`);
      return (await res.json()) as StructureStep;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('structure');
}

/**
 * Tarjima paketining javobi.
 *
 * `StructureStep` dan meros olinmaydi: maydonlarning ma'nosi bir xil bo'lsa
 * ham, ikki marshrut mustaqil o'zgaradi va meros ularni bir-biriga bog'lab
 * qo'yardi.
 */
interface TranslateStep {
  done: number;
  total: number;
  hasMore: boolean;
  /** Tillar teng — bosqich Gemini'siz, bir zumda o'tdi. */
  skippedSameLang?: boolean;
  /** Shu paketda tarjima qilingan savollar soni. */
  translated?: number;
  /** Vaqt yetmagani uchun keyingi so'rovga qoldirilgan savollar soni. */
  deferred?: number;
  failed?: number;
  failedSample?: { order: number; message: string }[];
  elapsedMs?: number;
  batches?: number;
  deadlineHit?: boolean;
  stalled?: boolean;
  rateLimited?: number;
  stuck?: number;
  lastError?: StepError;
}

/** Tarjima diagnostikasi — `logStructureStep` kabi faqat konsolga. */
function logTranslateStep(step: TranslateStep): void {
  if (step.skippedSameLang) {
    console.info('[import] translate skipped — manba va maqsad tili bir xil');
    return;
  }
  if (typeof step.elapsedMs === 'number') {
    console.info(
      '[import] translate elapsedMs',
      step.elapsedMs,
      `${step.done}/${step.total}`,
      `batches=${step.batches ?? '?'}`,
      `deadlineHit=${step.deadlineHit ?? false}`,
      `deferred=${step.deferred ?? 0}`,
      `rateLimited=${step.rateLimited ?? 0}`,
      `stuck=${step.stuck ?? 0}`,
    );
  }
  if (step.lastError) console.warn('[import] translate lastError', step.lastError);
  if (step.failed) {
    console.warn('[import] translate failed', step.failed, step.failedSample ?? []);
  }
}

/** Tarjima so'rovi — `postStructure` kabi tarmoq uzilishiga chidamli. */
async function postTranslate(jobId: string, retryFailed = false): Promise<TranslateStep> {
  let lastError: unknown = null;
  const query = retryFailed ? '?retryFailed=1' : '';
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await wait(RETRY_DELAYS[attempt - 1]);
    try {
      const res = await fetch(`/api/teacher/import/${jobId}/translate${query}`, { method: 'POST' });
      if (!res.ok) throw new Error(`translate ${res.status}`);
      return (await res.json()) as TranslateStep;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('translate');
}

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
  const [stage, setStage] = useState<Stage>('upload');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);
  const [resumedCount, setResumedCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  /** Terminal yiqilgan bloklar — "Yiqilganlarni qayta urinish" tugmasi shunga qaraydi. */
  const [stuck, setStuck] = useState(0);
  /**
   * Terminal yiqilgan TARJIMALAR — alohida hisoblagich.
   *
   * Bitta o'zgaruvchi yetmaydi: tarjima marshruti o'z terminal sonini
   * qaytaradi va u strukturaning sonini ustidan yozib yuborardi — strukturada
   * yiqilgan bloklar borligi ekranda jimgina yo'qolardi.
   */
  const [stuckTranslate, setStuckTranslate] = useState(0);
  /**
   * Vaqt chegarasi tufayli qoldirilgan savollar.
   *
   * Chat yo'liga o'tish taklifi shunga ham qaraydi: `deferred` — aynan
   * serverdagi AI ning vaqt byudjeti yetmagani, ya'ni chat yo'li bu savollarni
   * muammosiz oladi.
   */
  const [deferred, setDeferred] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('auto');

  const inputRef = useRef<HTMLInputElement>(null);

  // Tanlangan yo'l faqat brauzerda bor — birinchi render serverda bo'lgani
  // uchun u `useEffect` da o'qiladi.
  useEffect(() => {
    setMode(readMode());
  }, []);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  // Tugallanmagan import bormi. Bloklar allaqachon yozilgan bo'lsa ZIP endi
  // kerak emas — struktura bosqichi butunlay serverda, marshrut idempotent.
  useEffect(() => {
    const saved = readJob();
    if (!saved) return;
    fetch(`/api/teacher/import/${saved}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((job) => {
        const unfinished = job && job.blockCount > 0 && ['PARSING', 'STRUCTURING'].includes(job.status);
        if (unfinished) setResumeJobId(saved);
        else forgetJob();
      })
      .catch(() => {
        // Tarmoq yo'q — yozuvni o'chirmaymiz, keyingi ochilishda yana so'raladi.
      });
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

  /**
   * Bloklarni strukturalash — `hasMore` tugaguncha marshrutni chaqiradi.
   *
   * Server bir so'rovda vaqt byudjetiga sig'gan qadar ishlaydi (Vercel
   * chegarasi), shuning uchun sikl klientda: har aylanma o'zidan oldingisi
   * qoldirgan joydan davom etadi va `done` foizsiz, "N / M savol" bo'lib
   * ko'rsatiladi.
   */
  async function runStructure(id: string, retryFailed = false): Promise<void> {
    setStage('structure');
    // Yuklash bosqichidan qolgan SAHIFA hisobi tozalanadi: aks holda birinchi
    // javob kelguncha ekranda "2/2 savol" (sahifa soni) turib qolardi.
    setProgress(null);
    let previous = -1;
    let stalled = 0;

    for (let round = 0; ; round++) {
      // Yiqilganlarni tiklash faqat BIRINCHI aylanmada: keyingi aylanmalar
      // o'sha bloklarni cheksiz qaytarib, siklni aylantirardi.
      const step = await postStructure(id, retryFailed && round === 0);
      logStructureStep(step);
      setProgress({ done: step.done, total: step.total });
      setStuck(step.stuck ?? 0);
      setDeferred(step.deferred ?? 0);
      if (!step.hasMore) return;

      // Server bitta ham blok yoza olmadi — davom etish bekor: keyingi
      // so'rov ham xuddi shu joyda to'xtaydi.
      if (step.stalled) {
        // Kvota tugagan bo'lsa sabab boshqa va ustozning qiladigan ishi ham
        // boshqa: qayta urinish emas, kutish. Bloklar yo'qolmagan.
        if (step.rateLimited) throw new QuotaError(t('errorQuotaExhausted'));
        // Vaqt yetmagani ham "to'xtab qolish" EMAS: ish davom etadi, bloklar
        // joyida. Ustozga aytiladigan gap boshqa — "davom ettiring".
        if (step.deferred) {
          throw new StructureStalledError(t('errorDeferredByDeadline', { count: step.deferred }));
        }
        throw new StructureStalledError(t('errorStructureStalled'));
      }

      stalled = step.done > previous ? 0 : stalled + 1;
      previous = step.done;
      if (stalled >= MAX_STALLED_ROUNDS) throw new Error('structure stalled');
    }
  }

  /**
   * Savollarni tarjima qilish — `runStructure` bilan bir xil `hasMore` sikli.
   *
   * Tillar teng bo'lsa marshrut birinchi javobdayoq `skippedSameLang`
   * qaytaradi va sikl umuman aylanmaydi: o'zbekcha kitob uchun bu bosqich
   * ustozga sezilmasligi kerak.
   */
  async function runTranslate(id: string, retryFailed = false): Promise<void> {
    setStage('translate');
    // Struktura bosqichidan qolgan hisob tozalanadi — birinchi javob kelguncha
    // ekranda eski son turib qolmasin.
    setProgress(null);
    let previous = -1;
    let stalled = 0;

    for (let round = 0; ; round++) {
      const step = await postTranslate(id, retryFailed && round === 0);
      logTranslateStep(step);
      if (step.skippedSameLang) return;

      setProgress({ done: step.done, total: step.total });
      setStuckTranslate(step.stuck ?? 0);
      setDeferred(step.deferred ?? 0);
      if (!step.hasMore) return;

      if (step.stalled) {
        if (step.rateLimited) throw new QuotaError(t('errorQuotaExhausted'));
        if (step.deferred) {
          throw new StructureStalledError(t('errorDeferredByDeadline', { count: step.deferred }));
        }
        throw new StructureStalledError(t('errorTranslateStalled'));
      }

      stalled = step.done > previous ? 0 : stalled + 1;
      previous = step.done;
      if (stalled >= MAX_STALLED_ROUNDS) throw new Error('translate stalled');
    }
  }

  /**
   * Tugallanmagan importni davom ettirish — ZIP kerak emas.
   *
   * `retryFailed` — terminal yiqilgan bloklarni ham qaytadan navbatga qo'yish.
   */
  async function resumeStructure(id: string, retryFailed = false): Promise<void> {
    setResumeJobId(null);
    setJobId(id);
    setPhase('running');
    setErrorText(null);
    try {
      await runStructure(id, retryFailed);
      await runTranslate(id, retryFailed).catch((err: unknown) => {
        throw err instanceof StructureStalledError ? err : new Error(t('errorTranslate'));
      });
      forgetJob();
      setProgress(null);
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setErrorText(err instanceof StructureStalledError ? err.message : t('errorStructure'));
    }
  }

  async function run(): Promise<void> {
    if (!loaded || !plan) return;
    if (!subjectId) {
      setErrorText(t('errorNoSubject'));
      return;
    }

    setPhase('running');
    setStage('upload');
    setErrorText(null);
    setSummary(null);

    try {
      const fileUrl = await uploadManifest(loaded.manifestBytes).catch(() => {
        throw new Error(t('errorUpload'));
      });
      const job = await createJob(loaded.manifest, fileUrl);
      setJobId(job.jobId);
      rememberJob(job.jobId);
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
      // Javob kaliti BUTUN hujjat bo'ylab qidiriladi: u savol bloklarida emas,
      // `preamble` da (bet tepasidagi qator) yoki kolontitulda turishi mumkin,
      // ular esa serverga umuman yuborilmaydi.
      const keys = findAnswerKeys(flattenBlocks(loaded.manifest));
      const groups = plan.questions.map((q, order) => toUploadGroup(q, order, assetIds, keys));
      await sendGroups(job.jobId, { groups, pageImages }).catch(uploadError);
      result.questions = groups.length;
      setSummary(result);

      await runStructure(job.jobId).catch((err: unknown) => {
        throw err instanceof StructureStalledError ? err : new Error(t('errorStructure'));
      });

      // Tarjima strukturadan KEYIN: u `ImportDraft.textOriginal` ga tayanadi,
      // uni esa struktura bosqichi yozadi.
      await runTranslate(job.jobId).catch((err: unknown) => {
        throw err instanceof StructureStalledError ? err : new Error(t('errorTranslate'));
      });

      forgetJob();
      setProgress(null);
      setPhase('done');
    } catch (err) {
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

        {resumeJobId && phase === 'idle' && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-text-primary">{t('resumeFound')}</p>
            <button
              type="button"
              onClick={() => void resumeStructure(resumeJobId)}
              className="btn-primary min-h-11 inline-flex items-center justify-center"
            >
              {t('resumeStructure')}
            </button>
          </div>
        )}

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>
                {stage === 'upload'
                  ? t('progress', { done: progress.done, total: progress.total })
                  : t('progressQuestions', { done: progress.done, total: progress.total })}
              </span>
              <span>{t(STAGE_LABEL[stage])}</span>
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

        {/* Struktura bosqichi uzilgan bo'lsa ZIP ni qaytadan yuklash shart
            emas — bloklar serverda, marshrut qolgan joydan davom etadi. */}
        {phase === 'error' && stage !== 'upload' && jobId && (
          <button
            type="button"
            onClick={() => void resumeStructure(jobId)}
            className="btn-primary w-full sm:w-auto min-h-11 inline-flex items-center justify-center"
          >
            {t('resumeStructure')}
          </button>
        )}

        {/* Avtomatik yo'l vaqt yoki kvota tufayli to'xtaganda chat yo'li aynan
            shu savollarni oladi — eksport qolgan draftlarni o'zi topadi. */}
        {mode !== 'chat' && deferred + stuck + stuckTranslate > 0 && jobId && phase !== 'running' && (
          <button
            type="button"
            onClick={() => {
              setMode('chat');
              rememberMode('chat');
            }}
            className="btn-secondary w-full sm:w-auto min-h-11 inline-flex items-center justify-center"
          >
            {t('chatContinue')}
          </button>
        )}

        {/* Terminal yiqilgan bloklar ko'pincha kvota tufayli yiqilgan — sabab
            blokda emas, shuning uchun ularni qaytadan urinish mantiqan to'g'ri.
            Tugma faqat shunday bloklar bo'lganda ko'rinadi. */}
        {stuck + stuckTranslate > 0 && jobId && (phase === 'done' || phase === 'error') && (
          <button
            type="button"
            onClick={() => void resumeStructure(jobId, true)}
            className="btn-secondary w-full sm:w-auto min-h-11 inline-flex items-center justify-center"
          >
            {t('retryFailedBlocks', { count: stuck + stuckTranslate })}
          </button>
        )}

        {/* Bloklar serverda bo'lgandan keyin ikki yo'l ham ochiq: avtomatik
            yo'l allaqachon ishlab turgan bo'lishi mumkin, chat yo'li esa
            qolgan draftlarni (BLOCK va yiqilganlar) o'zi topib oladi. */}
        {jobId && stage !== 'upload' && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-text-primary">{t('chatModeTitle')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(['auto', 'chat'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    rememberMode(value);
                  }}
                  className={`min-h-11 flex-1 rounded-lg border px-3 ${
                    mode === value ? 'border-primary-600 bg-primary-50 font-medium' : 'border-border'
                  }`}
                >
                  {value === 'auto' ? t('chatModeAuto') : t('chatModeChat')}
                </button>
              ))}
            </div>

            {mode === 'chat' && <ImportChatMode jobId={jobId} />}
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
