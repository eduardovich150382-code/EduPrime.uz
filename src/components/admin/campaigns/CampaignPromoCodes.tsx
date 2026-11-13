'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Search, Send, Undo2 } from 'lucide-react';
import { utcToTashkentLocal } from '@/lib/date';
import type { PromoRow, PromoStatus } from '@/lib/campaign/promo-admin';
import { campaignApi, formatLocal } from './labels';

// Yakunlangan aksiya promokodlari: kurs admini mijozdan kod olganda shu yerda
// (yoki botda `/promo KOD`) tekshiradi va "Ishlatildi" deb belgilaydi.

const STATUS: Record<PromoStatus, { label: string; className: string }> = {
  active: { label: 'Faol', className: 'bg-green-100 text-green-800' },
  used: { label: 'Ishlatilgan', className: 'bg-gray-200 text-gray-700' },
  expired: { label: "Muddati o'tgan", className: 'bg-amber-100 text-amber-800' },
};

const time = (iso: string) => formatLocal(utcToTashkentLocal(new Date(iso)));
const NOTE_MAX = 200;

type Props = { campaignId: string; courseManager: string | null };

export default function CampaignPromoCodes({ campaignId, courseManager }: Props) {
  const base = `/api/admin/campaigns/${campaignId}/promo-codes`;
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [codes, setCodes] = useState<PromoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [marking, setMarking] = useState<{ id: string; note: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await campaignApi<{ codes: PromoRow[] }>(`${base}?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setCodes(res.data.codes);
      setError(null);
    } else setError(res.error);
  }, [base, query]);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, url: string, method: string, body?: unknown, done?: string) => {
    setBusy(id);
    setError(null);
    setNotice(null);
    const res = await campaignApi(url, { method, body });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMarking(null);
    if (done) setNotice(done);
    await load();
  };

  return (
    <section className="card space-y-3 p-4">
      <h3 className="font-semibold text-text-primary">Promokodlar</h3>
      <p className="text-xs text-text-secondary">
        Kurs admini{courseManager ? ` (${courseManager})` : ''} botga <code className="rounded bg-gray-100 px-1">/promo KOD</code> yozib tekshira oladi.
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kod, @username yoki ism" aria-label="Promokod qidirish"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm" />
        <button type="submit" aria-label="Qidirish" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-white hover:bg-primary-50">
          <Search size={18} aria-hidden />
        </button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {!codes && !error && <div className="flex justify-center py-6" role="status"><Loader2 size={24} className="animate-spin text-primary-600" /></div>}
      {codes?.length === 0 && <p className="text-sm text-text-secondary">{query ? 'Hech narsa topilmadi.' : "Promokod yo'q."}</p>}
      <ul className="grid gap-2 lg:grid-cols-2">
        {codes?.map((p) => (
          <li key={p.id} className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-base font-bold tracking-wider text-text-primary">{p.code} <span className="font-sans text-sm font-semibold text-primary-700">· {p.percent}%</span></p>
                <p className="wrap-break-word text-text-primary">{p.name || '—'}{p.username && <span className="text-text-secondary"> @{p.username}</span>}</p>
                <p className="text-xs text-text-secondary">ID {p.telegramId} · amal qiladi: {time(p.validUntil)} gacha</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
            </div>
            {p.usedAt && <p className="wrap-break-word text-xs text-text-secondary">Ishlatildi: {time(p.usedAt)}{p.usedNote ? ` · ${p.usedNote}` : ''}</p>}

            {marking?.id === p.id ? (
              <div className="space-y-2 rounded-lg bg-gray-50 p-2">
                {p.status === 'expired' && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /> Kodning muddati o&apos;tgan — baribir belgilaysizmi?</p>
                )}
                <input value={marking.note} maxLength={NOTE_MAX} onChange={(e) => setMarking({ id: p.id, note: e.target.value })} placeholder="Izoh (ixtiyoriy)" aria-label="Izoh"
                  className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm" />
                <div className="flex gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void act(p.id, `${base}/${p.id}`, 'PATCH', { used: true, note: marking.note.trim() || undefined })}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:opacity-50">
                    {busy === p.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} aria-hidden />} Tasdiqlash
                  </button>
                  <button type="button" onClick={() => setMarking(null)} className="min-h-11 rounded-lg border border-border px-3 text-sm">Ortga</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {p.usedAt ? (
                  <button type="button" disabled={busy !== null} onClick={() => void act(p.id, `${base}/${p.id}`, 'PATCH', { used: false })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                    <Undo2 size={16} aria-hidden /> Bekor qilish
                  </button>
                ) : (
                  <button type="button" disabled={busy !== null} onClick={() => setMarking({ id: p.id, note: '' })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50">
                    <Check size={16} aria-hidden /> Ishlatildi
                  </button>
                )}
                <button type="button" disabled={busy !== null} onClick={() => void act(p.id, `${base}/${p.id}/resend`, 'POST', undefined, `${p.code} egasiga qayta yuborildi`)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  {busy === p.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} aria-hidden />} Qayta yuborish
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
