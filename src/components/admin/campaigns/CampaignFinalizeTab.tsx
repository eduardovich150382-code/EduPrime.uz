'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import type { FinalizePreview } from '@/lib/campaign/finalize';
import CampaignPromoCodes from './CampaignPromoCodes';
import FinalizeNotifyBlock from './FinalizeNotifyBlock';
import FinalizeRecheckStep from './FinalizeRecheckStep';
import FinalizeResultStep from './FinalizeResultStep';
import { campaignApi, formatLocal } from './labels';

// "Yakunlash" tabi (A5): tugamagan → izoh; tugagan → qayta tekshiruv, natija,
// yakunlash; yakunlangan → xabarlar, promokodlar, g'oliblar posti havolasi.

export type FinalizeTabTarget = 'ranking' | 'posts';

type Props = { detail: CampaignDetail; onChanged: () => Promise<void>; onGoTab: (tab: FinalizeTabTarget) => void };

function Steps({ campaignId, onGoTab, onFinalized }: { campaignId: string; onGoTab: Props['onGoTab']; onFinalized: () => Promise<void> }) {
  const [preview, setPreview] = useState<FinalizePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await campaignApi<FinalizePreview>(`/api/admin/campaigns/${campaignId}/finalize/preview`);
    setLoading(false);
    if (res.ok) {
      setPreview(res.data);
      setError(null);
    } else setError(res.error);
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  if (!preview) {
    return error
      ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      : <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>;
  }
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <FinalizeRecheckStep campaignId={campaignId} unchecked={preview.uncheckedCount} onDone={load} />
      <FinalizeResultStep campaignId={campaignId} preview={preview} loading={loading} onRefresh={load}
        onGoRanking={() => onGoTab('ranking')} onFinalized={onFinalized} />
    </div>
  );
}

export default function CampaignFinalizeTab({ detail, onChanged, onGoTab }: Props) {
  const c = detail.campaign;
  // Yakunlash tugmasidan keyin xabarlar o'zi boshlanadi; sahifa qayta ochilsa — tugma bilan.
  const [autoNotify, setAutoNotify] = useState(false);

  if (!c.finalizedAt && !detail.ended) {
    return (
      <p className="card flex items-start gap-2 p-4 text-sm text-text-secondary">
        <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Aksiya {formatLocal(c.endsAtLocal)} da tugaydi. Yakunlash shundan keyin ochiladi. Muddatidan oldin tugatish uchun Asosiy → Tugash vaqti.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!c.isPublished && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Qoralama aksiya — sinov uchun yakunlash. Promokodlar faqat sinov ishtirokchilariga beriladi.
        </p>
      )}
      {!c.finalizedAt ? (
        <Steps campaignId={c.id} onGoTab={onGoTab} onFinalized={async () => { setAutoNotify(true); await onChanged(); }} />
      ) : (
        <>
          <FinalizeNotifyBlock campaignId={c.id} autoStart={autoNotify} />
          <section className="card space-y-1 p-4 text-sm">
            <h3 className="font-semibold text-text-primary">G&apos;oliblar posti</h3>
            {c.isPublished ? (
              <button type="button" onClick={() => onGoTab('posts')} className="min-h-11 text-left font-medium text-primary-700 hover:underline">
                G&apos;oliblar postini chiqarish → Postlar
              </button>
            ) : (
              <p className="text-text-secondary">Qoralamada g&apos;oliblar posti kanalga chiqmaydi — Postlar tabida «O&apos;zimga sinov» bilan tekshiring.</p>
            )}
          </section>
          <CampaignPromoCodes campaignId={c.id} courseManager={detail.courseManagerUsername} />
        </>
      )}
    </div>
  );
}
