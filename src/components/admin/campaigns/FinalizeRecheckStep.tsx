'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Square } from 'lucide-react';
import type { RecheckResult } from '@/lib/campaign/recheck';
import { campaignApi } from './labels';

// 1-qadam: qayta tekshiruv. Bitta so'rov ~45 s ishlaydi; tugma bosilgach
// klient `remaining = 0` bo'lguncha yoki xato chiqquncha qayta yuboradi —
// bu admin bosgan amalning davomi, fon so'rovi (polling) emas. "To'xtatish"
// joriy partiyadan keyin to'xtaydi; keyingi bosish qolgan joydan davom etadi.

type Progress = { checked: number; total: number; left: number; active: number };

type Props = { campaignId: string; unchecked: number; onDone: () => Promise<void> };

export default function FinalizeRecheckStep({ campaignId, unchecked, onDone }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  const start = async () => {
    stop.current = false;
    setRunning(true);
    setError(null);
    let acc: Progress = { checked: 0, total: unchecked, left: 0, active: 0 };
    setProgress(acc);
    while (!stop.current) {
      const res = await campaignApi<RecheckResult>(`/api/admin/campaigns/${campaignId}/recheck`, { method: 'POST' });
      if (!res.ok) {
        setError(res.error);
        break;
      }
      const r = res.data;
      acc = { checked: acc.checked + r.checked, total: Math.max(acc.total, acc.checked + r.checked + r.remaining), left: acc.left + r.becameLeft, active: acc.active + r.becameActive };
      setProgress(acc);
      if (r.error) {
        setError(r.error);
        break;
      }
      if (r.remaining === 0) break;
    }
    setRunning(false);
    await onDone();
  };

  const done = unchecked === 0 && !running;
  return (
    <section className="card space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-text-primary">
        {done ? <CheckCircle2 size={18} className="text-green-600" aria-hidden /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-700">1</span>}
        Qayta tekshiruv
      </h3>
      <p className="text-sm text-text-secondary">
        Har bir referal kanalda qayta tekshiriladi: chiqib ketganlar hisobdan olinadi, obuna bo&apos;lib «Obuna bo&apos;ldim» ni bosmaganlar hisoblanadi.
      </p>
      {done
        ? <p className="text-sm font-medium text-green-700">✅ Hamma referallar tekshirilgan</p>
        : <p className="text-sm text-text-primary">Tekshirilmagan: <b className="tabular-nums">{unchecked}</b></p>}
      {progress && (
        <p className="text-sm tabular-nums text-text-primary" role="status">
          Tekshirildi {progress.checked} / {progress.total} · chiqib ketgan: {progress.left} · yangi faol: {progress.active}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void start()} disabled={running || unchecked === 0}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          {running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} aria-hidden />} Qayta tekshirish
        </button>
        {running && (
          <button type="button" onClick={() => { stop.current = true; }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-gray-50">
            <Square size={14} aria-hidden /> To&apos;xtatish
          </button>
        )}
      </div>
    </section>
  );
}
