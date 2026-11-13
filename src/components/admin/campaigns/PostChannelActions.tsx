'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, Megaphone, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { CampaignPhase } from '@/lib/campaign/phase';
import type { PostView } from '@/lib/campaign/post-api';
import { POST_KIND_CONFIG, canPublishInPhase } from '@/lib/campaign/posts';
import type { EditorMessage } from './TelegramHtmlEditor';
import { campaignApi } from './labels';
import { formatPublished, type PostApiResult } from './post-ui';

// Kanal amallari: chiqarish, yangilash, yangi post sifatida, o'chirish va
// LAST_DAY avtomatik chiqarishini bekor qilish. Har biri tasdiqlash bilan va
// faqat mumkin bo'lganda ko'rinadi; saqlanmagan o'zgarish bo'lsa chiqarish o'chiq.

type Action = 'publish' | 'update' | 'republish' | 'unpublish' | 'cancelAuto';

const DIALOGS: Record<Action, { title: string; body: string; confirm: string; danger: boolean }> = {
  publish: { title: 'Kanalga chiqarish', body: 'Post kanalga hoziroq chiqadi.', confirm: 'Chiqarish', danger: false },
  update: { title: 'Kanaldagini yangilash', body: "Kanaldagi post saqlangan matn, rasm va tugma bilan almashadi.", confirm: 'Yangilash', danger: false },
  republish: { title: 'Yangi post sifatida chiqarish', body: 'Eski post kanalda qoladi — kerak bo\'lmasa, uni kanalda qo\'lda o\'chiring.', confirm: 'Chiqarish', danger: false },
  unpublish: { title: "Kanaldan o'chirish", body: "Post kanaldan o'chiriladi.", confirm: "O'chirish", danger: true },
  cancelAuto: { title: 'Avtomatik chiqarishni bekor qilish', body: "Saqlangan oxirgi kun posti o'chiriladi va cron uni kanalga chiqarmaydi.", confirm: 'Bekor qilish', danger: true },
};

const actionClass = 'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50';

type Props = { base: string; phase: CampaignPhase; post: PostView; dirty: boolean; onChanged: () => Promise<void> };

export default function PostChannelActions({ base, phase, post, dirty, onChanged }: Props) {
  const [dialog, setDialog] = useState<Action | null>(null);
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<EditorMessage | null>(null);

  const config = POST_KIND_CONFIG[post.kind];
  if (config.publishPhases.length === 0) return null;

  const inChannel = post.channelMessageId !== null;
  const allowed = canPublishInPhase(post.kind, phase);
  const canCancelAuto = post.kind === 'LAST_DAY' && !post.isDefault && !inChannel && !post.publishedAt;

  const run = async (action: Action) => {
    setDialog(null);
    setBusy(action);
    setMessage(null);
    const res = action === 'unpublish'
      ? await campaignApi<PostApiResult>(`${base}/channel`, { method: 'DELETE' })
      : action === 'cancelAuto'
        ? await campaignApi<PostApiResult>(base, { method: 'DELETE' })
        : await campaignApi<PostApiResult>(`${base}/publish`, {
          method: 'POST',
          body: { mode: action === 'update' ? 'update' : 'new', pin: action !== 'update' && pin, expectedUpdatedAt: post.updatedAt },
        });
    setBusy(null);
    setPin(false);
    // 409 (post o'zgargan yoki kanalda topilmadi) — ro'yxat baribir yangilansin.
    if (res.ok || res.status === 409) await onChanged();
    if (!res.ok) {
      setMessage({ tone: 'error', text: res.error });
      return;
    }
    const done: Record<Action, string> = {
      publish: 'Kanalga chiqarildi', update: 'Kanaldagi post yangilandi', republish: 'Yangi post kanalga chiqarildi',
      unpublish: "Kanaldan o'chirildi", cancelAuto: 'Avtomatik chiqarish bekor qilindi',
    };
    setMessage(res.data.warning ? { tone: 'error', text: res.data.warning } : { tone: 'ok', text: done[action] });
  };

  const button = (action: Action, label: string, Icon: typeof Megaphone, disabled = false) => (
    <button type="button" className={`${actionClass} ${DIALOGS[action].danger ? 'text-red-600' : ''}`} disabled={disabled || busy !== null}
      onClick={() => setDialog(action)}>
      {busy === action ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} aria-hidden />} {label}
    </button>
  );

  const showsPin = dialog === 'publish' || dialog === 'republish';
  return (
    <section className="card space-y-3 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Kanal</h3>
      {inChannel && post.publishedAt && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          Kanalda · {formatPublished(post.publishedAt)}
          {post.channelUrl && (
            <a href={post.channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary-700 underline">
              <ExternalLink size={14} aria-hidden /> Kanalda ochish
            </a>
          )}
        </p>
      )}
      {phase === 'DRAFT' && (
        <p className="text-xs text-amber-800">Kanalga chiqarish aksiya e&apos;lon qilingandan keyin. Hozir «O&apos;zimga sinov» bilan tekshiring.</p>
      )}
      {phase !== 'DRAFT' && !allowed && <p className="text-xs text-text-secondary">Aksiyaning hozirgi bosqichida bu postni kanalga chiqarib bo&apos;lmaydi.</p>}
      {dirty && allowed && <p className="text-xs font-medium text-amber-800">Avval saqlang — kanalga saqlangan variant chiqadi.</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {allowed && !inChannel && button('publish', 'Kanalga chiqarish', Megaphone, dirty)}
        {allowed && inChannel && button('update', 'Kanaldagini yangilash', RefreshCw, dirty)}
        {allowed && inChannel && button('republish', 'Yangi post sifatida chiqarish', Megaphone, dirty)}
        {inChannel && button('unpublish', "Kanaldan o'chirish", Trash2)}
        {canCancelAuto && button('cancelAuto', 'Avtomatik chiqarishni bekor qilish', XCircle)}
      </div>
      {message && (
        <p role="status" className={`text-sm wrap-break-word ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      {dialog && (
        <ConfirmDialog title={DIALOGS[dialog].title} body={DIALOGS[dialog].body} confirmLabel={DIALOGS[dialog].confirm}
          danger={DIALOGS[dialog].danger} busy={busy !== null} onClose={() => { setDialog(null); setPin(false); }} onConfirm={() => void run(dialog)}>
          {showsPin && (
            <label className="flex min-h-11 items-center gap-3 text-sm text-text-primary">
              <input type="checkbox" className="h-5 w-5" checked={pin} onChange={(e) => setPin(e.target.checked)} />
              Kanalda pin qilish
            </label>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
