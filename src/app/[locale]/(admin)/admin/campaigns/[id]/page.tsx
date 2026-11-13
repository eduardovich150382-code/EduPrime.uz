'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import { PHASE_LABELS, campaignApi, formatLocal } from '@/components/admin/campaigns/labels';
import CampaignStatusActions from '@/components/admin/campaigns/CampaignStatusActions';
import CampaignBasicTab from '@/components/admin/campaigns/CampaignBasicTab';
import CampaignRewardsTab from '@/components/admin/campaigns/CampaignRewardsTab';
import CampaignTextsTab from '@/components/admin/campaigns/CampaignTextsTab';
import CampaignPostsTab from '@/components/admin/campaigns/CampaignPostsTab';
import CampaignRankingTab from '@/components/admin/campaigns/CampaignRankingTab';

type Tab = 'basic' | 'rewards' | 'texts' | 'posts' | 'ranking';
const TABS: { id: Tab; label: string }[] = [
  { id: 'basic', label: 'Asosiy' },
  { id: 'rewards', label: 'Mukofotlar' },
  { id: 'texts', label: 'Matnlar' },
  { id: 'posts', label: 'Postlar' },
  { id: 'ranking', label: 'Reyting' },
];

export default function AdminCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('basic');

  const load = useCallback(async () => {
    const res = await campaignApi<CampaignDetail>(`/api/admin/campaigns/${id}`);
    if (res.ok) {
      setDetail(res.data);
      setError(null);
    } else setError(res.error);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (!detail) {
    return (
      <div className="space-y-4">
        <BackButton href="/admin/campaigns" className="mb-2 min-h-11" />
        {error
          ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          : <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>}
      </div>
    );
  }

  const c = detail.campaign;
  const phase = PHASE_LABELS[detail.phase];
  return (
    <div className="space-y-4 pb-8">
      <BackButton href="/admin/campaigns" className="mb-2 min-h-11" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 text-2xl font-bold text-text-primary wrap-break-word">{c.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${phase.className}`}>{phase.label}</span>
        </div>
        <p className="text-sm text-text-secondary">{formatLocal(c.startsAtLocal)} — {formatLocal(c.endsAtLocal)} (Toshkent) · {c.channelUsername}</p>
        <CampaignStatusActions detail={detail} onChanged={load} onDeleted={() => router.push('/admin/campaigns')} />
      </div>

      {detail.phase === 'DRAFT' && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Qoralama: faqat adminlar qatnasha oladi. Sinov uchun /aksiya yuboring.
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-text-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'basic' && <CampaignBasicTab detail={detail} onSaved={load} />}
        {tab === 'rewards' && <CampaignRewardsTab detail={detail} onSaved={load} />}
        {tab === 'texts' && <CampaignTextsTab detail={detail} onSaved={load} />}
        {tab === 'posts' && <CampaignPostsTab campaignId={c.id} phase={detail.phase} />}
        {tab === 'ranking' && <CampaignRankingTab campaignId={c.id} />}
      </div>
    </div>
  );
}
