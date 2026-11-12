'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { fieldClass, iconButtonClass } from '@/components/admin/AdminFields';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import { MAX_REWARD_TIERS, maxDiscountSum, rewardSummary, validateRewards } from '@/lib/campaign/admin-rules';
import type { RewardTier } from '@/lib/campaign/rewards';
import { campaignApi } from './labels';

type Props = { detail: CampaignDetail; onSaved: () => Promise<void> };
type Row = Record<keyof RewardTier, string>;

const COLUMNS: { key: keyof RewardTier; label: string }[] = [
  { key: 'fromRank', label: "O'rindan" },
  { key: 'toRank', label: "O'ringacha" },
  { key: 'percent', label: 'Chegirma %' },
  { key: 'minReferrals', label: 'Kamida referal' },
];

// Bo'sh katak NaN bo'ladi — validateRewards uni "butun son emas" deb ushlaydi.
const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));
const optional = (v: string) => (v.trim() === '' ? null : Number(v));
// format.ts db'ga bog'liq (bot-settings) — client uchun shu yerda.
const som = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

function toRow(t: RewardTier): Row {
  return { fromRank: String(t.fromRank), toRank: String(t.toRank), percent: String(t.percent), minReferrals: String(t.minReferrals) };
}

export default function CampaignRewardsTab({ detail, onSaved }: Props) {
  const c = detail.campaign;
  const [rows, setRows] = useState<Row[]>(c.rewardTiers.map(toRow));
  const [baseMin, setBaseMin] = useState(c.baseRewardMin === null ? '' : String(c.baseRewardMin));
  const [basePct, setBasePct] = useState(c.baseRewardPct === null ? '' : String(c.baseRewardPct));
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const finalized = c.finalizedAt !== null;

  const tiers = useMemo(() => rows.map((r) => ({
    fromRank: num(r.fromRank), toRank: num(r.toRank), percent: num(r.percent), minReferrals: num(r.minReferrals),
  })), [rows]);
  const base = { min: optional(baseMin), pct: optional(basePct) };
  const errors = validateRewards(tiers, base);

  const update = (index: number, key: keyof RewardTier, value: string) => setRows((list) => list.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const addRow = () => setRows((list) => {
    const last = list[list.length - 1];
    const from = last && Number.isFinite(num(last.toRank)) ? num(last.toRank) + 1 : 1;
    return [...list, { fromRank: String(from), toRank: String(from), percent: '10', minReferrals: '0' }];
  });

  const submit = async () => {
    setConfirm(false);
    setSaving(true);
    setMessage(null);
    const res = await campaignApi(`/api/admin/campaigns/${c.id}`, { method: 'PATCH', body: { rewards: { tiers, baseMin: base.min, basePct: base.pct } } });
    setSaving(false);
    if (!res.ok) {
      setMessage({ tone: 'error', text: res.error });
      return;
    }
    setMessage({ tone: 'ok', text: 'Saqlandi' });
    await onSaved();
  };

  return (
    <div className="space-y-4">
      {c.isPublished && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Aksiya e&apos;lon qilingan: ishtirokchilar boshqa shartlarni ko&apos;rgan. O&apos;zgartirishdan oldin kanalda xabar bering.
        </p>
      )}

      <div className="card space-y-3 p-4 sm:p-6">
        <div className="hidden grid-cols-[repeat(4,minmax(0,1fr))_2.75rem] gap-2 text-xs font-medium text-text-secondary sm:grid">
          {COLUMNS.map((col) => <span key={col.key}>{col.label}</span>)}
        </div>
        {rows.map((row, index) => (
          // Mobilda har qator — kartochka (2×2), desktop'da jadval qatori.
          <div key={index} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_2.75rem] sm:border-0 sm:p-0">
            {COLUMNS.map((col) => (
              <label key={col.key} className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
                <span className="sm:sr-only">{col.label}</span>
                <input type="number" inputMode="numeric" className={fieldClass} value={row[col.key]} disabled={finalized}
                  onChange={(e) => update(index, col.key, e.target.value)} />
              </label>
            ))}
            <button type="button" aria-label={`${index + 1}-pog'onani o'chirish`} title="O'chirish" disabled={finalized}
              onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
              className={`${iconButtonClass} col-span-2 border border-red-200 text-red-600 hover:bg-red-50 sm:col-span-1 sm:self-end`}>
              <Trash2 size={18} aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} disabled={finalized || rows.length >= MAX_REWARD_TIERS}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-text-secondary hover:bg-gray-50 disabled:opacity-50">
          <Plus size={16} aria-hidden /> Pog&apos;ona qo&apos;shish
        </button>

        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-sm font-medium text-text-primary">O&apos;rnidan qat&apos;i nazar</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>kamida</span>
            <input type="number" inputMode="numeric" className={`${fieldClass} w-24!`} value={baseMin} placeholder="—" disabled={finalized}
              onChange={(e) => setBaseMin(e.target.value)} aria-label="Kamida referal" />
            <span>ta referal →</span>
            <input type="number" inputMode="numeric" className={`${fieldClass} w-24!`} value={basePct} placeholder="—" disabled={finalized}
              onChange={(e) => setBasePct(e.target.value)} aria-label="Chegirma foizi" />
            <span>%</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Ikkalasi bo&apos;sh — bunday mukofot yo&apos;q.</p>
        </div>
      </div>

      <div className="card space-y-1 p-4 text-sm">
        <p className="font-medium text-text-primary">Xulosa</p>
        <p className="text-text-secondary wrap-break-word">{errors.length ? '—' : rewardSummary(tiers, base)}</p>
        {detail.coursePrice !== null && !errors.length && (
          <p className="text-text-secondary">
            Eng ko&apos;p berilishi mumkin bo&apos;lgan chegirma: <b className="text-text-primary">{som(maxDiscountSum(tiers, detail.coursePrice))}</b>
            {base.min !== null && ' + base: ishtirokchilar soniga bog\'liq'}
            <span className="block text-xs">Faqat sizga ko&apos;rinadi (kurs narxi: {som(detail.coursePrice)}).</span>
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={() => (c.isPublished ? setConfirm(true) : void submit())} disabled={saving || finalized || errors.length > 0}
          className="btn-primary flex min-h-11 items-center justify-center gap-2 py-2.5! text-sm disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {message && <p role="status" className={`text-sm ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Mukofotlarni o'zgartirish"
          body="Ishtirokchilar boshqa shartlarni ko'rgan. Baribir saqlansinmi?"
          confirmLabel="Saqlash"
          busy={saving}
          onClose={() => setConfirm(false)}
          onConfirm={() => void submit()}
        />
      )}
    </div>
  );
}
