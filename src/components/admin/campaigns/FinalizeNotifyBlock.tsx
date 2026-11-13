'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import type { NotifyStatus } from '@/lib/campaign/notify';
import { campaignApi } from './labels';

// Yakunlangandan keyin g'oliblar/mukofotsizlarga xabar. Klient `remaining = 0`
// bo'lguncha qayta yuboradi (admin bosgan amalning davomi). Sahifa yopilib
// qolsa — kursor `done` emas, "davom ettirish" tugmasi chiqadi.

type Batch = { sent: number; failed: number; remaining: number };
type Props = { campaignId: string; autoStart: boolean };

export default function FinalizeNotifyBlock({ campaignId, autoStart }: Props) {
  const url = `/api/admin/campaigns/${campaignId}/finalize/notify`;
  const [status, setStatus] = useState<NotifyStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    while (true) {
      const res = await campaignApi<Batch>(url, { method: 'POST' });
      if (!res.ok) {
        setError(res.error);
        break;
      }
      setStatus({ started: true, done: res.data.remaining === 0, sent: res.data.sent, failed: res.data.failed, remaining: res.data.remaining });
      if (res.data.remaining === 0) break;
    }
    setRunning(false);
  }, [url]);

  useEffect(() => {
    void (async () => {
      const res = await campaignApi<NotifyStatus>(url);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus(res.data);
      // Yakunlash tugmasidan keyin — o'zi boshlanadi (bir marta).
      if (autoStart && !res.data.done && !started.current) {
        started.current = true;
        await run();
      }
    })();
  }, [url, autoStart, run]);

  return (
    <section className="card space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-text-primary">
        {status?.done ? <CheckCircle2 size={18} className="text-green-600" aria-hidden /> : <Send size={18} className="text-primary-600" aria-hidden />}
        Ishtirokchilarga xabarlar
      </h3>
      {status && (
        <p className="text-sm tabular-nums text-text-primary" role="status">
          Yuborildi: {status.sent} · yetkazilmadi: {status.failed} · qoldi: {status.remaining}
        </p>
      )}
      {status && status.failed > 0 && (
        <p className="text-xs text-text-secondary">Yetkazilmagani — botni bloklagan yoki o&apos;chirgan foydalanuvchilar. G&apos;olibga promokodni quyidagi ro&apos;yxatdan «Qayta yuborish» bilan jo&apos;natish mumkin.</p>
      )}
      {status?.done && <p className="text-sm font-medium text-green-700">✅ Hamma xabarlar yuborildi</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {status && !status.done && (
        <button type="button" onClick={() => void run()} disabled={running}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto">
          {running ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} aria-hidden />}
          {running ? 'Yuborilmoqda…' : status.started ? 'Xabarlarni yuborishni davom ettirish' : 'Xabarlarni yuborish'}
        </button>
      )}
    </section>
  );
}
