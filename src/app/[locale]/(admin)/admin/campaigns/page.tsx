'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Gift, Loader2, Plus } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import { utcToTashkentLocal } from '@/lib/date';
import type { CampaignPhase } from '@/lib/campaign/phase';
import { PHASE_LABELS, campaignApi, formatLocal } from '@/components/admin/campaigns/labels';

type Item = { id: string; title: string; phase: CampaignPhase; startsAt: string; endsAt: string; participants: number; activeReferrals: number };

const local = (iso: string) => formatLocal(utcToTashkentLocal(new Date(iso)));

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void campaignApi<{ campaigns: Item[] }>('/api/admin/campaigns').then((res) => {
      if (res.ok) setItems(res.data.campaigns);
      else setError(res.error);
    });
  }, []);

  const create = async () => {
    setCreating(true);
    setError(null);
    const res = await campaignApi<{ campaign: { id: string } }>('/api/admin/campaigns', { method: 'POST' });
    setCreating(false);
    // 409 — "Avvalgi aksiyani yakunlang yoki o'chiring": bot bir vaqtda faqat bitta aksiyani biladi.
    if (!res.ok) setError(res.error);
    else router.push(`/admin/campaigns/${res.data.campaign.id}`);
  };

  return (
    <div className="space-y-4">
      <BackButton className="mb-2 min-h-11" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <Gift size={24} className="text-primary-600" aria-hidden /> Aksiyalar
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Referral aksiya: sanalar, mukofotlar, bot matnlari va reyting.</p>
        </div>
        <button type="button" onClick={() => void create()} disabled={creating}
          className="btn-primary flex min-h-11 items-center justify-center gap-2 py-2.5! text-sm disabled:opacity-50">
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Yangi aksiya
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!items && !error ? (
        <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
      ) : items && items.length === 0 ? (
        <p className="card p-4 text-sm text-text-secondary">Hali aksiya yo&apos;q. &quot;Yangi aksiya&quot; tugmasi qoralama yaratadi.</p>
      ) : (
        <ul className="space-y-3">
          {items?.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/campaigns/${item.id}`} className="card flex min-h-11 items-center gap-3 p-4 hover:bg-gray-50">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-primary wrap-break-word">{item.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_LABELS[item.phase].className}`}>{PHASE_LABELS[item.phase].label}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{local(item.startsAt)} — {local(item.endsAt)} (Toshkent)</p>
                  <p className="text-sm text-text-secondary">
                    Ishtirokchilar: <b className="text-text-primary">{item.participants}</b> · Faol referallar: <b className="text-text-primary">{item.activeReferrals}</b>
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-text-secondary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
