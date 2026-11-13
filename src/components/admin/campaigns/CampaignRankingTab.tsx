'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import Pager from '@/components/admin/Pager';
import { utcToTashkentLocal } from '@/lib/date';
import type { AdminRankingTotals } from '@/lib/campaign/admin-store';
import { campaignApi, formatLocal } from './labels';

// Jonli reyting. Avtomatik yangilanish ATAYLAB yo'q — har so'rov butun
// reytingni qayta yig'adi, ochiq qolgan tab Vercel CPU'sini yeb qo'ymasin.

type Row = {
  rank: number; telegramId: string; username: string | null; firstName: string | null;
  active: number; pending: number; left: number; invalid: number; lastActiveAt: string | null; percent: number; joinedAt: string;
};
type Ranking = { totals: AdminRankingTotals; rows: Row[]; page: number; totalPages: number; total: number; pageSize: number };

const time = (iso: string | null) => (iso ? formatLocal(utcToTashkentLocal(new Date(iso))) : '—');

function Who({ row }: { row: Row }) {
  return (
    <span className="min-w-0 wrap-break-word">
      <span className="font-medium text-text-primary">{row.firstName || '—'}</span>
      {row.username && (
        <a href={`https://t.me/${row.username}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary-600 hover:underline">@{row.username}</a>
      )}
    </span>
  );
}

export default function CampaignRankingTab({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/admin/campaigns/${campaignId}`;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await campaignApi<Ranking>(`${base}/ranking?page=${p}`);
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  }, [base]);

  useEffect(() => { void load(page); }, [load, page]);

  const tiles = data ? [
    ['Ishtirokchilar', data.totals.participants], ['Faol referallar', data.totals.active], ['Bugun qo\'shilgan', data.totals.today],
    ['Kutilmoqda', data.totals.pending], ['Chiqqanlar', data.totals.left], ['Yaroqsizlar', data.totals.invalid],
  ] as const : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void load(page)} disabled={loading}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Yangilash
        </button>
        <a href={`${base}/ranking.csv`} download
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50">
          <Download size={16} /> CSV yuklab olish
        </a>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map(([label, value]) => (
              <div key={label} className="card p-3">
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="text-xl font-bold tabular-nums text-text-primary">{value}</p>
              </div>
            ))}
          </div>

          {data.rows.length === 0 ? (
            <p className="card p-4 text-sm text-text-secondary">Hali ishtirokchi yo&apos;q.</p>
          ) : (
            <>
              {/* Mobil — kartochkalar */}
              <ul className="space-y-2 sm:hidden">
                {data.rows.map((row) => (
                  <li key={row.telegramId} className="card space-y-1 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 font-bold tabular-nums text-primary-700">#{row.rank}</span>
                      <Who row={row} />
                    </div>
                    <p className="text-text-secondary">
                      Faol: <b className="text-text-primary">{row.active}</b> · Kutilmoqda: {row.pending} · Chegirma: <b className="text-text-primary">{row.percent}%</b>
                    </p>
                    <p className="text-xs text-text-secondary">Oxirgi referal: {time(row.lastActiveAt)}</p>
                  </li>
                ))}
              </ul>
              {/* Desktop — jadval, o'z konteynerida suriladi */}
              <div className="card hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-text-secondary">
                      <th className="px-3 py-2 font-medium">O&apos;rin</th>
                      <th className="px-3 py-2 font-medium">Ism / username</th>
                      <th className="px-3 py-2 text-right font-medium">Faol</th>
                      <th className="px-3 py-2 text-right font-medium">Kutilmoqda</th>
                      <th className="px-3 py-2 font-medium">Oxirgi referal</th>
                      <th className="px-3 py-2 text-right font-medium">Chegirma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.telegramId} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2 font-semibold tabular-nums">{row.rank}</td>
                        <td className="px-3 py-2"><Who row={row} /></td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.active}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.pending}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{time(row.lastActiveAt)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} />
            </>
          )}
        </>
      )}
      {!data && loading && <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>}
    </div>
  );
}
