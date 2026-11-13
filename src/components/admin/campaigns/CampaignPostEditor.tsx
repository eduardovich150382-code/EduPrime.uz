'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { CampaignPhase } from '@/lib/campaign/phase';
import type { PostView } from '@/lib/campaign/post-api';
import { DEFAULT_POST_BUTTONS, POST_KIND_CONFIG, POST_VARIABLES_BY_KIND, buttonIssues, postLimit } from '@/lib/campaign/posts';
import type { TemplateVars } from '@/lib/campaign/texts';
import type { HtmlIssue } from '@/lib/telegram-html';
import TelegramHtmlEditor, { type EditorMessage } from './TelegramHtmlEditor';
import PostImageBlock from './PostImageBlock';
import PostChannelActions from './PostChannelActions';
import { autoPublishLabel, postImageUrl } from './post-ui';
import { campaignApi } from './labels';

// Bitta postning muharriri: matn (TelegramHtmlEditor), rasm, tugma va kanal amallari.

type Draft = { text: string; buttonText: string; buttonUrl: string };

const draftOf = (post: PostView): Draft => ({ text: post.text, buttonText: post.buttonText ?? '', buttonUrl: post.buttonUrl ?? '' });

type Props = {
  campaignId: string;
  phase: CampaignPhase;
  post: PostView;
  sampleVars: TemplateVars;
  refreshButton: ReactNode;
  onChanged: () => Promise<void>;
  onBack: () => void;
};

const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary';

export default function CampaignPostEditor({ campaignId, phase, post, sampleVars, refreshButton, onChanged, onBack }: Props) {
  const kind = post.kind;
  const config = POST_KIND_CONFIG[kind];
  const defaultButton = DEFAULT_POST_BUTTONS[kind];
  const base = `/api/admin/campaigns/${campaignId}/posts/${kind}`;
  const [draft, setDraft] = useState<Draft>(() => draftOf(post));
  // Server yangi holat bersa (saqlash, capture'dan keyin «Yangilash») qoralama shu holatga tenglashadi.
  const [syncedAt, setSyncedAt] = useState(post.updatedAt);
  if (syncedAt !== post.updatedAt) {
    setSyncedAt(post.updatedAt);
    setDraft(draftOf(post));
  }
  const [busy, setBusy] = useState<'save' | 'test' | 'reset' | null>(null);
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [serverIssues, setServerIssues] = useState<HtmlIssue[]>([]);

  const variables = POST_VARIABLES_BY_KIND[kind];
  const buttonErrors = useMemo(
    () => buttonIssues(kind, draft.buttonText.trim() || null, draft.buttonUrl.trim() || null).map((m) => ({ line: 0, message: m })),
    [kind, draft.buttonText, draft.buttonUrl],
  );
  const saved = draftOf(post);
  const dirty = draft.text !== saved.text || draft.buttonText.trim() !== saved.buttonText || draft.buttonUrl.trim() !== saved.buttonUrl;
  const body = (text: string) => ({ text, buttonText: draft.buttonText, buttonUrl: draft.buttonUrl });

  const save = async (mode: 'save' | 'reset') => {
    setBusy(mode);
    setMessage(null);
    const res = await campaignApi(base, { method: 'PATCH', body: body(mode === 'reset' ? '' : draft.text) });
    setBusy(null);
    if (!res.ok) {
      setServerIssues((res.data.issues as HtmlIssue[] | undefined) ?? []);
      setMessage({ tone: 'error', text: res.error });
      return;
    }
    setServerIssues([]);
    await onChanged();
    setMessage({ tone: 'ok', text: mode === 'reset' ? 'Standart matn tiklandi' : 'Saqlandi' });
  };

  const test = async () => {
    setBusy('test');
    setMessage(null);
    const res = await campaignApi(`${base}/test`, { method: 'POST', body: body(draft.text) });
    setBusy(null);
    setMessage(res.ok ? { tone: 'ok', text: "Post Telegram'ingizga yuborildi" } : { tone: 'error', text: res.error });
  };

  const auto = autoPublishLabel(post);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft size={16} aria-hidden /> Postlar ro&apos;yxati
        </button>
        {refreshButton}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{config.name}</h2>
        <p className="text-xs text-text-secondary">{config.where}</p>
        {auto && <p className="mt-1 text-xs font-medium text-text-primary">{auto}</p>}
        {kind === 'LAST_DAY' && post.isDefault && (
          <p className="mt-1 text-xs text-text-secondary">Standart matn bilan ham chiqishi uchun «Saqlash» ni bosing.</p>
        )}
      </div>

      <PostImageBlock base={base} post={post} imageSrc={post.hasImage ? postImageUrl(campaignId, kind, post.updatedAt) : null} onChanged={onChanged} />

      {config.hasButton && (
        <fieldset className="card space-y-3 p-4">
          <legend className="px-1 text-sm font-semibold text-text-primary">Tugma</legend>
          <p className="text-xs text-text-secondary">Bo&apos;sh qoldirilsa standart tugma: {defaultButton.text} → {defaultButton.url}</p>
          <label className="block text-xs font-medium text-text-secondary">
            Tugma matni
            <input className={`${inputClass} mt-1`} value={draft.buttonText} maxLength={60} placeholder={defaultButton.text}
              onChange={(e) => setDraft({ ...draft, buttonText: e.target.value })} />
          </label>
          <label className="block text-xs font-medium text-text-secondary">
            Tugma havolasi
            <input className={`${inputClass} mt-1 font-mono`} value={draft.buttonUrl} placeholder={defaultButton.url} inputMode="url"
              onChange={(e) => setDraft({ ...draft, buttonUrl: e.target.value })} />
          </label>
        </fieldset>
      )}

      <TelegramHtmlEditor
        value={draft.text}
        onChange={(text) => setDraft({ ...draft, text })}
        variables={variables}
        sampleVars={sampleVars}
        maxLength={postLimit(post.hasImage)}
        serverIssues={[...buttonErrors, ...serverIssues]}
        saveDisabled={buttonErrors.length > 0}
        busy={busy}
        message={message}
        onSave={() => save('save')}
        onTest={test}
        onReset={post.isDefault ? undefined : () => save('reset')}
        previewImage={post.hasImage ? postImageUrl(campaignId, kind, post.updatedAt) : null}
        previewButton={config.hasButton ? (draft.buttonText.trim() || defaultButton.text) : null}
      />

      <PostChannelActions base={base} phase={phase} post={post} dirty={dirty} onChanged={onChanged} />
    </div>
  );
}
