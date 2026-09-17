'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle, HelpCircle, Images, Loader2, Link2, X } from 'lucide-react';
import { matchByOrder, type MapEntry, type Pair } from '@/lib/import/image-match';
import {
  addImage,
  applyPairs,
  mapUrls,
  pairStatus,
  removeImage,
  summarize,
  toMatchInput,
  unattached,
  type AttachableQuestion,
  type PairStatus,
} from '@/lib/import/image-attach';

interface Props<Q extends AttachableQuestion> {
  questions: Q[];
  onChange: (next: Q[]) => void;
}

interface JobItem {
  id: string;
  fileName: string;
  createdAt: string;
  drafts: number;
}

interface AttachRun {
  pairs: Pair[];
  attached: number;
  /** Juftliklar shu sondagi qoralama uchun hisoblangan. */
  count: number;
}

const STATUS_STYLE: Record<PairStatus, { icon: typeof CheckCircle2; className: string }> = {
  verified: { icon: CheckCircle2, className: 'text-green-700 bg-green-50 border-green-200' },
  flagged: { icon: AlertTriangle, className: 'text-red-700 bg-red-50 border-red-300' },
  unchecked: { icon: HelpCircle, className: 'text-gray-600 bg-gray-50 border-gray-200' },
};

/**
 * Chatdan kelgan qoralama savollarga ZIP importi rasmlarini biriktirish.
 *
 * `AiImportPanel` ichida emas: savollar ro'yxati sahifada turadi, panel esa
 * uni bilmaydi. Komponent boshqariladigan — qoralama faqat `onChange` orqali
 * o'zgaradi, shuning uchun ikkala sahifa o'z holatini o'zi saqlaydi.
 *
 * Tartib bo'yicha moslashda qo'shni savollar orasidagi bir qadamlik siljishni
 * sonlar ham, `score` ham tutmasligi mumkin. Oxirgi himoya — ustozning ko'zi:
 * shuning uchun har rasm eskiz bo'lib ko'rinadi va ro'yxat hech qachon qayta
 * saralanmaydi (tartibni ko'z bilan tekshirish aynan shunga tayanadi).
 */
export default function ImportImageAttach<Q extends AttachableQuestion>({ questions, onChange }: Props<Q>) {
  const t = useTranslations('teacherImport');
  const locale = useLocale();
  const [jobs, setJobs] = useState<JobItem[] | null>(null);
  const [jobsError, setJobsError] = useState(false);
  const [jobId, setJobId] = useState('');
  const [entries, setEntries] = useState<MapEntry[] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [run, setRun] = useState<AttachRun | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  // Tez-tez tanlash almashtirilsa kechikkan javob yangi tanlovni bosib ketmasin.
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/teacher/import/jobs')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { jobs: JobItem[] }) => {
        if (!cancelled) setJobs(data.jobs);
      })
      .catch(() => {
        if (!cancelled) setJobsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectJob = async (id: string) => {
    const request = ++requestRef.current;
    setJobId(id);
    setEntries(null);
    setRun(null);
    setSelected(null);
    setOnlyFlagged(false);
    setMapError(false);
    if (!id) return;
    setMapLoading(true);
    try {
      const res = await fetch(`/api/teacher/import/${id}/image-map`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { entries: MapEntry[] };
      if (request === requestRef.current) setEntries(data.entries);
    } catch {
      if (request === requestRef.current) setMapError(true);
    } finally {
      if (request === requestRef.current) setMapLoading(false);
    }
  };

  const fromMap = useMemo(() => mapUrls(entries ?? []), [entries]);
  const strip = useMemo(() => unattached(entries ?? [], questions), [entries, questions]);
  // Qoralama soni o'zgarsa belgilar boshqa savollarga tegishli bo'lib qoladi — ko'rsatilmaydi.
  const pairs = run && run.count === questions.length ? run.pairs : null;
  const summary = pairs ? summarize(pairs) : null;
  const countMatches = entries !== null && entries.length === questions.length;

  const attach = () => {
    if (!entries) return;
    const result = matchByOrder(entries, questions.map(toMatchInput));
    if (result.countMismatch) return;
    onChange(applyPairs(questions, entries, result.pairs));
    setRun({ pairs: result.pairs, attached: result.attached, count: questions.length });
    setSelected(null);
  };

  const onQuestionClick = (index: number) => {
    if (!selected) return;
    onChange(addImage(questions, index, selected));
    setSelected(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' });

  return (
    <section className="rounded-xl border border-border p-4 space-y-4 min-w-0">
      <div className="flex items-start gap-2">
        <Images size={20} className="text-primary-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary">{t('attachTitle')}</h3>
          <p className="text-xs text-text-secondary">{t('attachHint')}</p>
        </div>
      </div>

      {jobsError ? (
        <p className="text-sm text-red-700">{t('attachErrorJobs')}</p>
      ) : jobs === null ? (
        <p className="text-sm text-text-secondary flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {t('attachLoading')}
        </p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('attachNoJobs')}</p>
      ) : (
        <select
          value={jobId}
          onChange={(e) => selectJob(e.target.value)}
          className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm"
          aria-label={t('attachSelectJob')}
        >
          <option value="">{t('attachSelectJob')}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {t('attachJobOption', { name: job.fileName, date: formatDate(job.createdAt), drafts: job.drafts })}
            </option>
          ))}
        </select>
      )}

      {mapLoading && (
        <p className="text-sm text-text-secondary flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {t('attachLoading')}
        </p>
      )}
      {mapError && <p className="text-sm text-red-700">{t('attachErrorMap')}</p>}

      {entries && (
        <>
          {countMatches ? (
            <p className="text-sm text-green-700">
              {t('attachCountMatch', { total: entries.length, count: questions.length })}
            </p>
          ) : (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="font-medium">
                {t('attachCountMismatch', { total: entries.length, count: questions.length })}
              </p>
              <p className="text-xs">{t('attachMismatchReason')}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={attach}
              disabled={!countMatches}
              className="btn-primary min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              <Link2 size={16} /> {t('attachButton')}
            </button>
            {run && pairs && summary && (
              <p className="text-sm text-text-primary">
                {t('attachResult', { attached: run.attached, left: strip.length })}
                {summary.flagged > 0 && t('attachResultFlagged', { count: summary.flagged })}
                {summary.unchecked > 0 && t('attachResultUnchecked', { count: summary.unchecked })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">
              {t('attachStripTitle', { count: strip.length })}
            </p>
            {strip.length === 0 ? (
              <p className="text-xs text-text-secondary">{t('attachStripEmpty')}</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {strip.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelected(selected === url ? null : url)}
                    aria-pressed={selected === url}
                    className={`shrink-0 rounded-lg border-2 bg-white ${selected === url ? 'border-primary-600 ring-2 ring-primary-300' : 'border-border'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" loading="lazy" className="h-16 w-16 object-contain" />
                  </button>
                ))}
              </div>
            )}
            {selected && <p className="text-xs text-primary-700">{t('attachPickQuestion')}</p>}
          </div>

          <label className="flex items-center gap-2 min-h-[44px] text-sm text-text-primary">
            <input
              type="checkbox"
              checked={onlyFlagged}
              disabled={!summary || summary.flagged === 0}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="h-5 w-5"
            />
            {t('attachOnlyFlagged')}
          </label>

          <ol className="space-y-2">
            {questions.map((question, index) => {
              const pair = pairs?.[index];
              const status = pair ? pairStatus(pair) : null;
              if (onlyFlagged && status !== 'flagged') return null;
              const style = status ? STATUS_STYLE[status] : null;
              const StatusIcon = style?.icon;
              return (
                <li
                  key={index}
                  onClick={() => onQuestionClick(index)}
                  className={`rounded-lg border p-3 min-w-0 ${status === 'flagged' ? 'border-red-300 bg-red-50/40' : 'border-border'} ${selected ? 'cursor-pointer hover:border-primary-400' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-text-secondary shrink-0 mt-0.5">#{index + 1}</span>
                    <p className="flex-1 min-w-0 text-sm text-text-primary line-clamp-2 break-words">{question.text}</p>
                    {style && StatusIcon && status && (
                      <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${style.className}`}>
                        <StatusIcon size={12} /> {t(`attachStatus_${status}`)}
                      </span>
                    )}
                  </div>
                  {question.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {question.images.map((url) => (
                        <div key={url} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" loading="lazy" className="h-16 w-16 object-contain rounded border border-border bg-white" />
                          {fromMap.has(url) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                // Savol kartasining "shu savolga qo'sh" bosishi ishga tushmasin.
                                e.stopPropagation();
                                onChange(removeImage(questions, index, url));
                              }}
                              aria-label={t('attachRemove')}
                              className="absolute -top-3 -right-3 h-11 w-11 flex items-center justify-center"
                            >
                              <span className="h-6 w-6 rounded-full bg-white border border-border shadow flex items-center justify-center">
                                <X size={14} />
                              </span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
