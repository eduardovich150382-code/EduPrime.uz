'use client';

import { useState } from 'react';
import { Pause, Play, Rocket, Trash2, Undo2 } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { actionButtonClass, dangerOutlineClass } from '@/components/admin/AdminFields';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import { canDelete, rewardSummary, statusTransition, type StatusAction } from '@/lib/campaign/admin-rules';
import { campaignApi, formatLocal } from './labels';

type Action = StatusAction | 'delete';
type Props = { detail: CampaignDetail; onChanged: () => Promise<void>; onDeleted: () => void };

const ACTIONS: Record<Action, { label: string; icon: typeof Rocket; title: string; body: string; danger: boolean }> = {
  publish: { label: "E'lon qilish", icon: Rocket, title: "Aksiyani e'lon qilish", body: '', danger: false },
  pause: { label: 'Pauza', icon: Pause, title: 'Aksiyani pauza qilish', body: "Pauzada yangi qatnashish va referallar qabul qilinmaydi, kunlik xabar ketmaydi.", danger: false },
  resume: { label: 'Davom ettirish', icon: Play, title: 'Aksiyani davom ettirish', body: "Aksiya yana faol bo'ladi.", danger: false },
  unpublish: { label: 'Qoralamaga qaytarish', icon: Undo2, title: 'Qoralamaga qaytarish', body: 'Aksiya ommadan yashiriladi: faqat adminlar qatnasha oladi.', danger: false },
  delete: { label: "O'chirish", icon: Trash2, title: "Aksiyani o'chirish", body: "Aksiya, uning barcha (sinov) ishtirokchilari va referallari o'chadi. Qaytarib bo'lmaydi.", danger: true },
};

export default function CampaignStatusActions({ detail, onChanged, onDeleted }: Props) {
  const c = detail.campaign;
  const [open, setOpen] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  const [clearTestData, setClearTestData] = useState(true);

  // Server qoidalarni qayta tekshiradi — bu yerda faqat qaysi tugma ko'rinishi.
  const state = { isPublished: c.isPublished, isPaused: c.isPaused, startsAt: new Date(c.startsAt), endsAt: new Date(c.endsAt), finalizedAt: c.finalizedAt ? new Date(c.finalizedAt) : null };
  const now = new Date();
  const visible: Action[] = (['publish', 'pause', 'resume', 'unpublish'] as const).filter((a) => statusTransition(state, a, now).ok);
  if (canDelete(c).ok) visible.push('delete');

  const close = () => {
    setOpen(null);
    setError(null);
    setClearTestData(true);
  };

  const run = async (action: Action) => {
    setBusy(true);
    setError(null);
    const res = action === 'delete'
      ? await campaignApi(`/api/admin/campaigns/${c.id}`, { method: 'DELETE' })
      : await campaignApi(`/api/admin/campaigns/${c.id}/status`, { method: 'POST', body: { action, clearTestData: action === 'publish' ? clearTestData : undefined } });
    setBusy(false);
    if (!res.ok) {
      setError({ text: res.error, problems: Array.isArray(res.data.problems) ? (res.data.problems as string[]) : [] });
      return;
    }
    close();
    if (action === 'delete') onDeleted();
    else await onChanged();
  };

  if (!visible.length) return null;
  const config = open ? ACTIONS[open] : null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action) => {
        const { label, icon: Icon, danger } = ACTIONS[action];
        return (
          <button key={action} type="button" onClick={() => setOpen(action)}
            className={danger ? dangerOutlineClass : action === 'publish'
              ? `${actionButtonClass} bg-primary-600 text-white hover:bg-primary-700`
              : `${actionButtonClass} border border-border bg-white text-text-primary hover:bg-primary-50`}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        );
      })}

      {open && config && (
        <ConfirmDialog title={config.title} body={config.body || undefined} confirmLabel={config.label} danger={config.danger} busy={busy}
          onClose={close} onConfirm={() => void run(open)}>
          {open === 'publish' && (
            <div className="space-y-3 text-sm">
              <dl className="space-y-1 rounded-lg bg-gray-50 p-3">
                <div><dt className="inline text-text-secondary">Sanalar: </dt><dd className="inline">{formatLocal(c.startsAtLocal)} — {formatLocal(c.endsAtLocal)} (Toshkent)</dd></div>
                <div><dt className="inline text-text-secondary">Kanal: </dt><dd className="inline">{c.channelUsername}</dd></div>
                <div className="wrap-break-word"><dt className="inline text-text-secondary">Pog&apos;onalar: </dt><dd className="inline">{rewardSummary(c.rewardTiers, { min: c.baseRewardMin, pct: c.baseRewardPct })}</dd></div>
              </dl>
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={clearTestData} onChange={(e) => setClearTestData(e.target.checked)} />
                <span>
                  Sinov ma&apos;lumotlarini o&apos;chirish: {detail.testData.participants} ta ishtirokchi, {detail.testData.referrals} ta referal
                  <span className="block text-xs text-text-secondary">Qoralamada faqat adminlar qatnashgan — bu sinov ballari reytingda qolmasin.</span>
                </span>
              </label>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error.problems.length > 1 ? <ul className="list-inside list-disc">{error.problems.map((p) => <li key={p}>{p}</li>)}</ul> : error.text}
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
