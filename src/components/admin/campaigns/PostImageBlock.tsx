'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Smartphone, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { PostView } from '@/lib/campaign/post-api';
import type { EditorMessage } from './TelegramHtmlEditor';
import { campaignApi } from './labels';

// Postning rasmi va "Telegram'dan olish". Rasm faylini sayt saqlamaydi:
// server uni adminning Telegramiga yuborib, file_id ni yozadi.

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';
const actionClass = 'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50';

type Props = { base: string; post: PostView; imageSrc: string | null; onChanged: () => Promise<void> };

export default function PostImageBlock({ base, post, imageSrc, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'capture' | 'remove' | null>(null);
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setMessage({ tone: 'error', text: 'Rasm 4 MB dan katta' });
      return;
    }
    setBusy('upload');
    setMessage(null);
    const form = new FormData();
    form.append('file', file);
    let result: EditorMessage;
    try {
      const res = await fetch(`${base}/image`, { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      result = res.ok ? { tone: 'ok', text: 'Rasm yuklandi' } : { tone: 'error', text: data.error ?? 'Server xatosi' };
    } catch {
      result = { tone: 'error', text: "Server bilan aloqa o'rnatilmadi" };
    }
    setBusy(null);
    if (result.tone === 'ok') await onChanged();
    setMessage(result);
  };

  const capture = async () => {
    setBusy('capture');
    setMessage(null);
    const res = await campaignApi(`${base}/capture`, { method: 'POST' });
    setBusy(null);
    setMessage(res.ok
      ? { tone: 'ok', text: "Telegram'ingizga ko'rsatma yuborildi. Xabarni botga yuboring (10 daqiqa), so'ng «Yangilash» ni bosing." }
      : { tone: 'error', text: res.error });
  };

  const remove = async () => {
    setConfirmRemove(false);
    setBusy('remove');
    setMessage(null);
    const res = await campaignApi(`${base}/image`, { method: 'DELETE' });
    setBusy(null);
    if (res.ok) await onChanged();
    setMessage(res.ok ? { tone: 'ok', text: 'Rasm olib tashlandi' } : { tone: 'error', text: res.error });
  };

  return (
    <section className="card space-y-3 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Rasm</h3>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin proxy rasmi
        <img src={imageSrc} alt="Post rasmi" className="h-24 w-24 rounded-lg object-cover" />
      ) : (
        <p className="text-xs text-text-secondary">Rasm yo&apos;q — post oddiy matn bo&apos;lib chiqadi (4096 belgigacha). Rasm bilan izoh 1024 belgigacha.</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input ref={fileInput} type="file" accept={ACCEPT} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
        <button type="button" className={actionClass} disabled={busy !== null} onClick={() => fileInput.current?.click()}>
          {busy === 'upload' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} aria-hidden />} Rasm yuklash
        </button>
        <button type="button" className={actionClass} disabled={busy !== null} onClick={capture}>
          {busy === 'capture' ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} aria-hidden />} 📲 Telegram&apos;dan olish
        </button>
        {post.hasImage && (
          <button type="button" className={`${actionClass} text-red-600`} disabled={busy !== null} onClick={() => setConfirmRemove(true)}>
            {busy === 'remove' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} aria-hidden />} Rasmni olib tashlash
          </button>
        )}
      </div>
      <p className="text-xs text-text-secondary">«Telegram&apos;dan olish»: botga formatlangan matn yoki bitta rasm (izohi bilan) yuborasiz — post shu xabardan olinadi.</p>
      {message && (
        <p role="status" className={`text-sm wrap-break-word ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      {confirmRemove && (
        <ConfirmDialog title="Rasmni olib tashlash" body="Post rasmsiz, oddiy matn bo'lib qoladi." confirmLabel="Olib tashlash"
          onClose={() => setConfirmRemove(false)} onConfirm={remove} />
      )}
    </section>
  );
}
