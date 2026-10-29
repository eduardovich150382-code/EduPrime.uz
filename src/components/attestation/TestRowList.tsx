'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ListChecks, Lock, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { filterMocks, type MockFilter } from '@/lib/attestation-stats';
import { GOAL_STYLES } from '@/lib/goal-styles';
import { primaryButton, secondaryButton } from '@/components/tests/button-classes';
import type { MockRow } from '@/lib/attestation-page';
import { TierPill } from './TierPill';
import { HintSwitch } from '@/components/ui/ViewerGate';

const FILTERS: MockFilter[] = ['all', 'unsolved', 'solved'];

const statusSkeleton = <span aria-hidden className="inline-block h-5 w-20 animate-pulse rounded-full bg-gray-200" />;
const actionSkeleton = <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-gray-200 sm:w-40" />;

function personal(pending: boolean | 'hint', ready: ReactNode, skeleton: ReactNode): ReactNode {
  if (pending === true) return skeleton;
  if (pending === 'hint') return <HintSwitch guest={ready} authed={skeleton} />;
  return ready;
}

// Ranglar docs/design/testlar-ui.md "to'g'ri" holatidan; "Yangi" —
// attestatsiya maqsad belgisi bilan bir xil juftlik.
const SOLVED_PILL = { color: '#166534', background: '#dcfce7' };

// Mock va mavzu testlari ro'yxati — bitta komponent, farqi faqat sarlavha,
// bo'sh holat matni va tartib raqami (mavzu testida `number === null`).
// Faqat server tayyorlagan qatorlarni chizadi — savol yoki javob ma'lumoti
// bu komponentga hech qachon kelmaydi (lib/attestation-page.ts).
// `lockedHref` — obuna kartasi shu sahifada bo'lsa qulflangan qator unga
// olib boradi (boshqa sahifaga emas). Berilmasa avvalgi havola.
// `pending` — sahifa statik: qatorlar mehmon holatida keladi. Kirgan
// foydalanuvchida `/me` kelguncha holat va tugma o'rnida skeleton (`true`),
// sessiya noma'lum bo'lsa ikkalasi ham, CSS ishorasi tanlaydi (`'hint'`).
export function TestRowList({ title, rows, emptyText, lockedHref, pending = false }: {
  title: string; rows: MockRow[]; emptyText: string; lockedHref?: string; pending?: boolean | 'hint';
}) {
  const t = useTranslations('attestation');
  const tests = useTranslations('tests.card');
  const [filter, setFilter] = useState<MockFilter>('all');
  const visible = filterMocks(rows, filter);

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        {rows.length > 0 && (
          <div role="group" aria-label={t('filter.label')} className="overflow-x-auto">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`min-h-11 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${
                    filter === f ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-primary-50'
                  }`}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-text-secondary">{emptyText}</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-text-secondary">{t('list.emptyFiltered')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {row.number !== null && (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-base font-bold tabular-nums text-primary-700"
                  >
                    {row.number}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-snug text-text-primary wrap-break-word">{row.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks size={16} aria-hidden /> {tests('questions', { count: row.questionCount })}
                    </span>
                    {personal(pending, <>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={row.solved ? SOLVED_PILL : GOAL_STYLES.ATTESTATION}
                      >
                        {row.solved ? t('status.solved') : t('status.new')}
                      </span>
                      {row.solved && row.ball !== null ? (
                        // Mock — rasmiy 100 ballik shkala va toifa.
                        <>
                          <span className="font-medium" style={{ color: '#166534' }}>
                            {t('list.lastBall', { score: row.ball })}
                          </span>
                          {row.tier && <TierPill tier={row.tier} label={t(`tiers.${row.tier}`)} />}
                        </>
                      ) : row.solved && (
                        <span className="font-medium" style={{ color: '#166534' }}>
                          {/* Eski natijalarda maxScore 0 bo'lishi mumkin — TestCard'dagi kabi foiz. */}
                          {row.lastMax
                            ? t('list.lastScore', { score: row.lastScore ?? 0, max: row.lastMax })
                            : t('list.lastPercent', { percent: row.lastPercent ?? 0 })}
                        </span>
                      )}
                    </>, statusSkeleton)}
                  </div>
                </div>
              </div>

              <div className="w-full shrink-0 sm:w-auto">
                {personal(pending, <>
                  {row.solved && row.secondaryHref ? (
                    <div className="grid grid-cols-2 gap-2 sm:w-72">
                      <Link href={row.secondaryHref} className={secondaryButton}>
                        {t('list.result')}
                      </Link>
                      <Link href={row.primaryHref} className={primaryButton}>
                        <RotateCcw size={16} aria-hidden /> {t('list.retake')}
                      </Link>
                    </div>
                  ) : row.locked && lockedHref ? (
                    <a href={lockedHref} className={`${primaryButton} sm:w-auto sm:min-w-40`}>
                      <Lock size={16} aria-hidden />
                      {t('list.unlockWithSubscription')}
                    </a>
                  ) : (
                    <Link href={row.primaryHref} className={`${primaryButton} sm:w-auto sm:min-w-40`}>
                      {row.locked && <Lock size={16} aria-hidden />}
                      {t('list.start')}
                      {row.lockBadge && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                          {row.lockBadge.kind === 'price'
                            ? tests('lockPrice', { price: row.lockBadge.price.toLocaleString() })
                            : row.lockBadge.kind === 'premium'
                            ? tests('lockPremium')
                            : row.lockBadge.kind === 'subscription'
                            ? tests('lockSubscription')
                            : tests('lockTeacher')}
                        </span>
                      )}
                    </Link>
                  )}
                </>, actionSkeleton)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
