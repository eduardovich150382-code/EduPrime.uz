'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Field, fieldClass } from '@/components/admin/AdminFields';
import { ChannelCheckButton, ToggleField } from '@/components/admin/TelegramSettingsControls';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import { STARTS_AT_LOCKED_ERROR } from '@/lib/campaign/admin-rules';
import { tashkentLocalToUtc } from '@/lib/date';
import { campaignApi } from './labels';

type Props = { detail: CampaignDetail; onSaved: () => Promise<void> };

export default function CampaignBasicTab({ detail, onSaved }: Props) {
  const c = detail.campaign;
  const [form, setForm] = useState({
    title: c.title, startsAt: c.startsAtLocal, endsAt: c.endsAtLocal, channelUsername: c.channelUsername,
    channelLink: c.channelLink, dailyEnabled: c.dailyEnabled, promoValidDays: String(c.promoValidDays),
  });
  const [saving, setSaving] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const finalized = c.finalizedAt !== null;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setConfirmEnd(false);
    setSaving(true);
    setMessage(null);
    const res = await campaignApi(`/api/admin/campaigns/${c.id}`, {
      method: 'PATCH',
      body: { basic: { ...form, promoValidDays: Number(form.promoValidDays) } },
    });
    setSaving(false);
    if (!res.ok) {
      setMessage({ tone: 'error', text: res.error });
      return;
    }
    setMessage({ tone: 'ok', text: 'Saqlandi' });
    await onSaved();
  };

  const save = () => {
    // Tugash vaqtini o'tgan vaqtga qo'yish — aksiyani darhol to'xtatadi; ataylab ekanini so'raymiz.
    const end = tashkentLocalToUtc(form.endsAt);
    if (form.endsAt !== c.endsAtLocal && end && end.getTime() <= Date.now()) setConfirmEnd(true);
    else void submit();
  };

  return (
    <div className="card space-y-4 p-4 sm:p-6">
      <Field label="Nomi">
        <input className={fieldClass} value={form.title} maxLength={120} disabled={finalized} onChange={(e) => set('title', e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Boshlanish (Toshkent vaqti)">
          <input type="datetime-local" className={fieldClass} value={form.startsAt} disabled={finalized || detail.startLocked}
            onChange={(e) => set('startsAt', e.target.value)} />
          {detail.startLocked && <span className="text-xs text-text-secondary">{STARTS_AT_LOCKED_ERROR}</span>}
        </Field>
        <Field label="Tugash (Toshkent vaqti)">
          <input type="datetime-local" className={fieldClass} value={form.endsAt} disabled={finalized} onChange={(e) => set('endsAt', e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kanal username">
          <input className={fieldClass} value={form.channelUsername} placeholder="@kanal" disabled={finalized || c.isPublished}
            onChange={(e) => set('channelUsername', e.target.value)} />
        </Field>
        <Field label="Kanal havolasi">
          <input className={fieldClass} value={form.channelLink} placeholder="https://t.me/kanal" disabled={finalized || c.isPublished}
            onChange={(e) => set('channelLink', e.target.value)} />
        </Field>
      </div>
      {c.isPublished && <p className="text-xs text-text-secondary">Kanal faqat qoralamada o&apos;zgaradi: referallar shu kanalga bog&apos;langan.</p>}
      <ChannelCheckButton channel={form.channelUsername} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kunlik natija xabari">
          <ToggleField checked={form.dailyEnabled} label="Kunlik natija xabari" onChange={(v) => set('dailyEnabled', v === 'true')} />
        </Field>
        <Field label="Promokod muddati, kun">
          <input type="number" inputMode="numeric" min={1} max={60} className={fieldClass} value={form.promoValidDays} disabled={finalized}
            onChange={(e) => set('promoValidDays', e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={save} disabled={saving || finalized}
          className="btn-primary flex min-h-11 items-center justify-center gap-2 py-2.5! text-sm disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {message && <p role="status" className={`text-sm ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
      </div>

      {confirmEnd && (
        <ConfirmDialog
          title="Aksiya darhol tugaydi"
          body="Tugash vaqti o'tgan vaqtga qo'yilgan. Saqlansa, aksiya hozir tugaydi va yangi referallar qabul qilinmaydi."
          confirmLabel="Ha, saqlash"
          busy={saving}
          onClose={() => setConfirmEnd(false)}
          onConfirm={() => void submit()}
        />
      )}
    </div>
  );
}
