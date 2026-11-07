'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Download, Loader2, Trophy } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Pager from '@/components/admin/Pager';
import UserProfileModal from '@/components/admin/UserProfileModal';
import { actionButtonClass } from '@/components/admin/AdminFields';
import { formatTime } from '@/lib/utils';

type Mode = 'best' | 'first';
interface Row {
  rank: number;
  user: { id: string; name: string | null; telegramUsername: string | null; email: string | null };
  score: number; maxScore: number; percentage: number; timeSpent: number; completedAt: string; attemptsCount: number;
}
interface RatingData {
  test: { id: string; titleUz: string };
  summary: { participants: number; attemptsTotal: number; avgPercentage: number; maxPercentage: number };
  rows: Row[];
}

const PAGE_SIZE = 50;
const MEDALS: Record<number, { icon: string; className: string }> = {
  1: { icon: '🥇', className: 'bg-yellow-100 text-yellow-800 ring-yellow-300' },
  2: { icon: '🥈', className: 'bg-gray-100 text-gray-700 ring-gray-300' },
  3: { icon: '🥉', className: 'bg-orange-100 text-orange-800 ring-orange-300' },
};

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank];
  if (!medal) return <span className="inline-flex min-w-9 justify-center text-sm font-semibold text-text-secondary">{rank}</span>;
  return (
    <span className={`inline-flex min-w-9 items-center justify-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-bold ring-1 ${medal.className}`}>
      <span aria-hidden>{medal.icon}</span>{rank}
    </span>
  );
}

export default function AdminTestRatingPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('adminRating');
  const tc = useTranslations('adminCommon');
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>('best');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RatingData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const params = new URLSearchParams({ mode, page: String(page), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/admin/tests/${encodeURIComponent(id)}/rating?${params}`, { cache: 'no-store' });
      if (res.status === 404) { setStatus('notFound'); return; }
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [id, mode, page]);

  useEffect(() => { void load(); }, [load]);

  const total = data?.summary.participants ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = (next: number) => { setPage(Math.min(Math.max(1, next), totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const date = (value: string) => new Date(value).toLocaleString(locale, { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' });
  const contact = (user: Row['user']) => user.telegramUsername ? `@${user.telegramUsername}` : user.email ?? '';
  const nameButton = (user: Row['user']) => (
    <button type="button" onClick={() => setProfileId(user.id)} className="min-h-11 text-left font-medium text-primary-700 hover:underline break-words">
      {user.name || tc('unnamed')}
    </button>
  );

  const cards = data ? [
    ['participants', data.summary.participants],
    ['attemptsTotal', data.summary.attemptsTotal],
    ['avgPercentage', `${data.summary.avgPercentage}%`],
    ['maxPercentage', `${data.summary.maxPercentage}%`],
  ] as const : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/admin/tests" className="inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary hover:text-primary-600">
        <ArrowLeft size={16} aria-hidden /> {t('backToTests')}
      </Link>

      {status === 'notFound' ? (
        <p className="card p-8 text-center text-text-secondary">{t('notFound')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-bold text-text-primary flex items-start gap-2 break-words min-w-0">
              <Trophy size={24} className="text-amber-500 flex-shrink-0 mt-1" aria-hidden />
              <span className="min-w-0">{data?.test.titleUz ?? t('title')}</span>
            </h1>
            <a
              href={`/api/admin/tests/${encodeURIComponent(id)}/rating/export?mode=${mode}`}
              download
              className={`${actionButtonClass} flex-shrink-0 self-start bg-green-50 text-green-800 hover:bg-green-100`}
            >
              <Download size={16} aria-hidden /> {t('export')}
            </a>
          </div>

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cards.map(([key, value]) => (
                <div key={key} className="card p-4">
                  <p className="text-2xl font-bold text-text-primary">{value}</p>
                  <p className="text-xs text-text-secondary">{t(`cards.${key}`)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2" role="group" aria-label={t('modeLabel')}>
            {(['best', 'first'] as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setPage(1); }}
                className={`min-h-11 px-4 rounded-xl text-sm font-medium ${mode === m ? 'bg-primary-600 text-white' : 'bg-white border border-border text-text-secondary hover:border-primary-200'}`}>
                {t(`modes.${m}`)}
              </button>
            ))}
          </div>

          {status === 'error' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{tc('error')}</p>}

          {status === 'loading' && !data ? (
            <div className="card p-12 text-center"><Loader2 size={32} className="animate-spin text-primary-600 mx-auto" /></div>
          ) : data && data.rows.length === 0 ? (
            <p className="card p-8 text-center text-text-secondary">{t('empty')}</p>
          ) : data && (
            <div className={status === 'loading' ? 'opacity-60' : ''}>
              <div className="space-y-3 md:hidden">
                {data.rows.map((row) => (
                  <div key={row.user.id} className="card p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <RankBadge rank={row.rank} />
                      <div className="min-w-0 flex-1">
                        {nameButton(row.user)}
                        <p className="text-xs text-text-secondary break-all">{contact(row.user)}</p>
                      </div>
                      <span className="text-lg font-bold text-text-primary">{row.percentage}%</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span>{t('score', { score: row.score, max: row.maxScore })}</span>
                      <span>{formatTime(row.timeSpent)}</span>
                      <span>{date(row.completedAt)}</span>
                      <span>{t('attempts', { count: row.attemptsCount })}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        {(['rank', 'user', 'score', 'percentage', 'time', 'date', 'attempts'] as const).map((col) => (
                          <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">{t(`columns.${col}`)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => (
                        <tr key={row.user.id} className="border-b border-border">
                          <td className="px-4 py-2"><RankBadge rank={row.rank} /></td>
                          <td className="px-4 py-2">
                            {nameButton(row.user)}
                            <p className="text-xs text-text-secondary break-all">{contact(row.user)}</p>
                          </td>
                          <td className="px-4 py-2 text-sm">{row.score}/{row.maxScore}</td>
                          <td className="px-4 py-2 text-sm font-semibold">{row.percentage}%</td>
                          <td className="px-4 py-2 text-sm tabular-nums">{formatTime(row.timeSpent)}</td>
                          <td className="px-4 py-2 text-sm whitespace-nowrap">{date(row.completedAt)}</td>
                          <td className="px-4 py-2 text-sm">{row.attemptsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pager page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={goToPage} />
            </div>
          )}
        </>
      )}

      {profileId && <UserProfileModal userId={profileId} onClose={() => setProfileId(null)} />}
    </div>
  );
}
