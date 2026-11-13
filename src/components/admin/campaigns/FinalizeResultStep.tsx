'use client';

import { useState } from 'react';
import { Flag, Loader2, RefreshCw } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { FinalizePreview } from '@/lib/campaign/finalize';
import { campaignApi } from './labels';

// format.ts server modullarini (bot-settings → db) tortadi — client'da shu kichik nusxa.
const formatSom = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

// 2–3-qadamlar: yakuniy natija va yakunlash. Natija — preview; yakunlash
// serverda reytingni qayta hisoblaydi (shu orada o'zgargan bo'lishi mumkin).

type Props = {
  campaignId: string;
  preview: FinalizePreview;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onGoRanking: () => void;
  onFinalized: () => Promise<void>;
};

function Who({ name, username }: { name: string | null; username: string | null }) {
  return (
    <span className="min-w-0 wrap-break-word">
      <span className="font-medium text-text-primary">{name || '—'}</span>
      {username && <span className="ml-1 text-text-secondary">@{username}</span>}
    </span>
  );
}

export default function FinalizeResultStep({ campaignId, preview, loading, onRefresh, onGoRanking, onFinalized }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [skipRecheck, setSkipRecheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchecked = preview.uncheckedCount > 0;

  const finalize = async () => {
    setBusy(true);
    setError(null);
    const res = await campaignApi(`/api/admin/campaigns/${campaignId}/finalize`, { method: 'POST', body: { skipRecheck: unchecked ? skipRecheck : undefined } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setConfirm(false);
    await onFinalized();
  };

  const close = () => {
    setConfirm(false);
    setSkipRecheck(false);
    setError(null);
  };

  return (
    <>
      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-700">2</span>
            Natija
          </h3>
          <button type="button" onClick={() => void onRefresh()} disabled={loading}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} aria-hidden />} Yangilash
          </button>
        </div>
        <p className="text-sm text-text-secondary">
          Ishtirokchilar: <b className="text-text-primary">{preview.participantCount}</b> · Faol referallar: <b className="text-text-primary">{preview.activeReferrals}</b> ·
          G&apos;oliblar: <b className="text-text-primary">{preview.winners.length}</b> · Mukofotsiz: <b className="text-text-primary">{preview.noPrizeCount}</b>
          {preview.maxDiscountSum !== null && <> · Jami chegirma: <b className="text-text-primary">{formatSom(preview.maxDiscountSum)}</b> <span className="text-xs">(faqat sizga ko&apos;rinadi)</span></>}
        </p>
        <button type="button" onClick={onGoRanking} className="min-h-11 text-left text-sm font-medium text-primary-700 hover:underline">
          Yaroqsiz referallarni ko&apos;rish uchun → Reyting
        </button>

        {preview.winners.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-text-secondary">Mukofot oladigan ishtirokchi yo&apos;q.</p>
        ) : (
          <>
            <ul className="space-y-2 sm:hidden">
              {preview.winners.map((w) => (
                <li key={w.telegramId} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-bold tabular-nums text-primary-700">#{w.rank}</span>
                    <Who name={w.name} username={w.username} />
                  </div>
                  <p className="text-text-secondary">Ball: <b className="text-text-primary">{w.score}</b> · Chegirma: <b className="text-text-primary">{w.percent}%</b></p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-text-secondary">
                    <th className="px-3 py-2 font-medium">O&apos;rin</th>
                    <th className="px-3 py-2 font-medium">Ism / username</th>
                    <th className="px-3 py-2 text-right font-medium">Ball</th>
                    <th className="px-3 py-2 text-right font-medium">Chegirma</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.winners.map((w) => (
                    <tr key={w.telegramId} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 font-semibold tabular-nums">{w.rank}</td>
                      <td className="px-3 py-2"><Who name={w.name} username={w.username} /></td>
                      <td className="px-3 py-2 text-right tabular-nums">{w.score}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{w.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-700">3</span>
          Yakunlash
        </h3>
        <p className="text-sm text-text-secondary">G&apos;oliblarga promokod bilan xabar, qolganlarga «mukofotsiz» xabari yuboriladi.</p>
        <button type="button" onClick={() => setConfirm(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 sm:w-auto">
          <Flag size={16} aria-hidden /> Yakunlash
        </button>
      </section>

      {confirm && (
        <ConfirmDialog title="Aksiyani yakunlash" confirmLabel="Yakunlash" busy={busy} onClose={close} onConfirm={() => void finalize()}
          body={`${preview.winners.length} ta promokod, ${preview.noPrizeCount} kishiga «mukofotsiz» xabari.`}>
          <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            Bu amalni bekor qilib bo&apos;lmaydi: promokodlar yaratiladi va xabarlar yuboriladi.
          </p>
          {unchecked && (
            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={skipRecheck} onChange={(e) => setSkipRecheck(e.target.checked)} />
              <span>
                Qayta tekshiruvsiz yakunlash
                <span className="block text-xs text-text-secondary">{preview.uncheckedCount} ta referal tekshirilmagan — chiqib ketganlar ham hisoblanadi.</span>
              </span>
            </label>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
