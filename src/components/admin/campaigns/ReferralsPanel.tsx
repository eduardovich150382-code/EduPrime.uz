'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Ban, Loader2, RotateCcw, X } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { dangerOutlineClass } from '@/components/admin/AdminFields';
import { utcToTashkentLocal } from '@/lib/date';
import { campaignApi, formatLocal } from './labels';

// Reyting tabidagi "Referallar" paneli (A5): soxta referallarni yaroqsiz
// qilish va tiklash. Sariq qator — 1 daqiqada ≥ 3 ta referal: faqat ishora,
// qarorni admin qiladi. Mobilda pastdan, desktop'da o'ngdan chiqadi.

type Status = 'PENDING' | 'ACTIVE' | 'LEFT' | 'INVALID';
type Referral = {
  id: string; firstName: string | null; username: string | null; telegramId: string; status: Status;
  createdAt: string; confirmedAt: string | null; checkedAt: string | null; suspicious: boolean;
};
type Data = {
  participant: { id: string; firstName: string | null; username: string | null; telegramId: string };
  finalized: boolean; noUsernameCount: number; referrals: Referral[];
};

const STATUS: Record<Status, { label: string; className: string }> = {
  ACTIVE: { label: 'Faol', className: 'bg-green-100 text-green-800' },
  PENDING: { label: 'Kutilmoqda', className: 'bg-blue-100 text-blue-800' },
  LEFT: { label: 'Chiqqan', className: 'bg-gray-200 text-gray-700' },
  INVALID: { label: 'Yaroqsiz', className: 'bg-red-100 text-red-700' },
};

const time = (iso: string | null) => (iso ? formatLocal(utcToTashkentLocal(new Date(iso))) : '—');

type Props = { campaignId: string; participantId: string; title: string; onClose: () => void; onChanged: () => void };

export default function ReferralsPanel({ campaignId, participantId, title, onClose, onChanged }: Props) {
  const base = `/api/admin/campaigns/${campaignId}`;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    const res = await campaignApi<Data>(`${base}/participants/${participantId}/referrals`);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  }, [base, participantId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirmAll) onClose(); };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [onClose, confirmAll]);

  const act = async (id: string, url: string, body?: unknown) => {
    setBusy(id);
    setError(null);
    const res = await campaignApi(url, { method: body === undefined ? 'POST' : 'PATCH', body });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    await load();
    onChanged();
    return true;
  };

  const invalidateAll = async () => {
    if (await act('all', `${base}/participants/${participantId}/invalidate-all`)) setConfirmAll(false);
  };

  const readOnly = data?.finalized ?? true;
  const activeCount = data?.referrals.filter((r) => r.status !== 'INVALID').length ?? 0;
  const suspiciousCount = data?.referrals.filter((r) => r.suspicious).length ?? 0;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-gray-950/50" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={`Referallar: ${title}`}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[28rem] sm:rounded-none">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-text-primary wrap-break-word">Referallar · {title}</h2>
            {data && (
              <p className="text-xs text-text-secondary">
                Jami {data.referrals.length} · username&apos;siz: {data.noUsernameCount}
                {suspiciousCount > 0 && <> · <span className="text-amber-700">shubhali: {suspiciousCount}</span></>}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!data && !error && <div className="flex justify-center py-8" role="status"><Loader2 size={24} className="animate-spin text-primary-600" /></div>}
          {data && (
            <>
              {readOnly ? (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-text-secondary">Aksiya yakunlangan — faqat ko&apos;rish mumkin.</p>
              ) : (
                <button type="button" disabled={activeCount === 0 || busy !== null} onClick={() => setConfirmAll(true)} className={`${dangerOutlineClass} w-full`}>
                  <Ban size={16} aria-hidden /> Barchasini yaroqsiz qilish
                </button>
              )}
              {suspiciousCount > 0 && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                  Sariq qatorlar: 1 daqiqa ichida 3 va undan ko&apos;p referal kelgan. Bu faqat ishora — tekshirib, o&apos;zingiz qaror qiling.
                </p>
              )}
              {data.referrals.length === 0 && <p className="text-sm text-text-secondary">Referal yo&apos;q.</p>}
              <ul className="space-y-2">
                {data.referrals.map((r) => (
                  <li key={r.id} className={`rounded-xl border p-3 text-sm ${r.suspicious ? 'border-amber-300 bg-amber-50' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 wrap-break-word">
                        <span className="font-medium text-text-primary">{r.firstName || '—'}</span>
                        {r.username
                          ? <a href={`https://t.me/${r.username}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary-600 hover:underline">@{r.username}</a>
                          : <span className="ml-1 text-xs text-text-secondary">(username yo&apos;q)</span>}
                        <p className="text-xs text-text-secondary">ID {r.telegramId}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      Kelgan: {time(r.createdAt)} · Tasdiq: {time(r.confirmedAt)} · Tekshiruv: {time(r.checkedAt)}
                    </p>
                    {!readOnly && (
                      r.status === 'INVALID' ? (
                        <button type="button" disabled={busy !== null} onClick={() => void act(r.id, `${base}/referrals/${r.id}`, { status: 'RESTORE' })}
                          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-primary-50 disabled:opacity-50">
                          {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} aria-hidden />} Tiklash
                        </button>
                      ) : (
                        <button type="button" disabled={busy !== null} onClick={() => void act(r.id, `${base}/referrals/${r.id}`, { status: 'INVALID' })}
                          className={`mt-2 ${dangerOutlineClass}`}>
                          {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} aria-hidden />} Yaroqsiz
                        </button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {confirmAll && (
        <ConfirmDialog title="Ishtirokchini chetlatish" confirmLabel="Barchasini yaroqsiz qilish" busy={busy === 'all'}
          body={`${title} ning barcha ${activeCount} ta referali yaroqsiz bo'ladi va reytingda hisoblanmaydi. Keyin har birini alohida tiklash mumkin.`}
          onClose={() => setConfirmAll(false)} onConfirm={() => void invalidateAll()} />
      )}
    </div>
  );
}
