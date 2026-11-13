'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { CampaignDetail } from '@/lib/campaign/admin-api';
import { textLimit } from '@/lib/campaign/admin-rules';
import { CAMPAIGN_VARIABLES, type CampaignTextKey } from '@/lib/campaign/texts';
import type { HtmlIssue } from '@/lib/telegram-html';
import TelegramHtmlEditor, { type EditorMessage } from './TelegramHtmlEditor';
import { TEXT_LABELS, VARIABLE_HINTS, campaignApi } from './labels';

const VARIABLES = CAMPAIGN_VARIABLES.map((name) => ({ name, hint: VARIABLE_HINTS[name] }));

type Props = { detail: CampaignDetail; onSaved: () => Promise<void> };

export default function CampaignTextsTab({ detail, onSaved }: Props) {
  const [selected, setSelected] = useState<CampaignTextKey | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | 'reset' | null>(null);
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [serverIssues, setServerIssues] = useState<HtmlIssue[]>([]);
  const base = `/api/admin/campaigns/${detail.campaign.id}`;

  const open = (key: CampaignTextKey) => {
    setSelected(key);
    setDraft(detail.texts.find((t) => t.key === key)?.text ?? '');
    setMessage(null);
    setServerIssues([]);
  };

  if (!selected) {
    return (
      <ul className="card divide-y divide-gray-100">
        {detail.texts.map((t) => (
          <li key={t.key}>
            <button type="button" onClick={() => open(t.key)} className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">{TEXT_LABELS[t.key].name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.isDefault ? 'bg-gray-100 text-gray-600' : 'bg-primary-50 text-primary-700'}`}>
                    {t.isDefault ? 'Standart' : "O'zgartirilgan"}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">{TEXT_LABELS[t.key].when}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-text-secondary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const key = selected;
  const limit = textLimit(key);

  const save = async (text: string, mode: 'save' | 'reset') => {
    setBusy(mode);
    setMessage(null);
    const res = await campaignApi(base, { method: 'PATCH', body: { texts: { [key]: text } } });
    setBusy(null);
    if (res.ok) {
      setServerIssues([]);
      await onSaved();
      if (mode === 'reset') setDraft(detail.texts.find((t) => t.key === key)?.defaultText ?? '');
      setMessage({ tone: 'ok', text: mode === 'reset' ? 'Standart matn tiklandi' : 'Saqlandi — bot darhol yangi matnni ishlatadi' });
      return;
    }
    const textErrors = res.data.textErrors as Partial<Record<CampaignTextKey, HtmlIssue[]>> | undefined;
    setServerIssues(textErrors?.[key] ?? []);
    setMessage({ tone: 'error', text: res.error });
  };

  const test = async () => {
    setBusy('test');
    setMessage(null);
    const res = await campaignApi(`${base}/test-message`, { method: 'POST', body: { key, text: draft } });
    setBusy(null);
    setMessage(res.ok ? { tone: 'ok', text: "Xabar Telegram'ingizga yuborildi" } : { tone: 'error', text: res.error });
  };

  const current = detail.texts.find((t) => t.key === key);
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setSelected(null)} className="flex min-h-11 items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} aria-hidden /> Matnlar ro&apos;yxati
      </button>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{TEXT_LABELS[key].name}</h2>
        <p className="text-xs text-text-secondary">{TEXT_LABELS[key].when} · <span className="font-mono">{key}</span></p>
        {key === 'share_post' && (
          <p className="mt-1 text-xs font-medium text-primary-700">Postlar → Ulashiladigan post saqlangan bo&apos;lsa, bu matn o&apos;rniga o&apos;sha ishlatiladi.</p>
        )}
      </div>
      <TelegramHtmlEditor
        value={draft}
        onChange={setDraft}
        variables={VARIABLES}
        sampleVars={detail.sampleVars}
        maxLength={limit.max}
        plain={limit.plain}
        serverIssues={serverIssues}
        busy={busy}
        message={message}
        onSave={() => save(draft, 'save')}
        onTest={test}
        onReset={current?.isDefault ? undefined : () => save('', 'reset')}
      />
    </div>
  );
}
