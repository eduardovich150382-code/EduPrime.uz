'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { BOT_USERNAME } from '@/lib/telegram-bot-links';
import {
  ADMIN_MESSAGE_LINK_MAX, ADMIN_MESSAGE_TEXT_MAX, ADMIN_MESSAGE_TITLE_MAX,
  isAllowedAdminMessageLink, type AdminMessageResult,
} from '@/lib/admin-message';

export type MessageTemplate = 'receipt' | 'badReceipt' | 'confirmed';

export interface MessageRecipient {
  id: string;
  name: string | null;
  username?: string | null;
  hasTelegram: boolean;
}

interface Props {
  user: MessageRecipient;
  open: boolean;
  onClose: () => void;
  defaultTemplate?: MessageTemplate;
}

interface Draft { title: string; message: string; link: string }

const TEMPLATES: MessageTemplate[] = ['receipt', 'badReceipt', 'confirmed'];
const BOT_URL = `https://t.me/${BOT_USERNAME}`;

export default function SendMessageDialog({ open, ...props }: Props) {
  if (!open) return null;
  // key: boshqa foydalanuvchi uchun ochilganda oldingi qoralama va natija qolib ketmasin.
  return <DialogBody key={props.user.id} {...props} />;
}

function DialogBody({ user, onClose, defaultTemplate }: Omit<Props, 'open'>) {
  const t = useTranslations('adminMessage');

  // Chek botga yuboriladi: ulangan foydalanuvchi xabarni botning o'zida o'qiydi,
  // ulanmaganiga esa botni ochish havolasi kerak (sababi — PR tavsifida).
  const templateDraft = (template: MessageTemplate): Draft => {
    if (template === 'receipt') {
      return user.hasTelegram
        ? { title: t('templateReceipt'), message: t('receiptText'), link: '' }
        : { title: t('templateReceipt'), message: t('receiptTextNoTelegram'), link: BOT_URL };
    }
    if (template === 'badReceipt') return { title: t('templateBadReceipt'), message: t('badReceiptText'), link: '' };
    return { title: t('templateConfirmed'), message: t('confirmedText'), link: '' };
  };

  const [draft, setDraft] = useState<Draft>(() => defaultTemplate ? templateDraft(defaultTemplate) : { title: '', message: '', link: '' });
  const [toSite, setToSite] = useState(true);
  const [toTelegram, setToTelegram] = useState(user.hasTelegram);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AdminMessageResult | null>(null);
  const [failed, setFailed] = useState(false);

  const link = draft.link.trim();
  const linkInvalid = link !== '' && !isAllowedAdminMessageLink(link);
  const noChannel = !toSite && !toTelegram;
  const canSend = !sending && draft.title.trim() !== '' && draft.message.trim() !== '' && !linkInvalid && !noChannel;

  const update = (patch: Partial<Draft>) => { setDraft((current) => ({ ...current, ...patch })); setResult(null); setFailed(false); };

  const send = async () => {
    if (!canSend) return;
    setSending(true); setResult(null); setFailed(false);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draft.title, message: draft.message, link: link || null, channels: { site: toSite, telegram: toTelegram } }),
      });
      if (res.ok) setResult(await res.json()); else setFailed(true);
    } catch { setFailed(true); }
    setSending(false);
  };

  const telegramStatus = result?.telegram === 'sent' ? t('telegramSent')
    : result?.telegram === 'failed' ? t('telegramFailed')
      : result?.telegram === 'not_linked' ? t('telegramNotLinkedStatus') : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="send-message-heading"
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
          <div className="min-w-0">
            <h3 id="send-message-heading" className="font-semibold text-text-primary flex items-center gap-2">
              <MessageSquare size={18} className="text-primary-600 flex-shrink-0" /> {t('heading')}
            </h3>
            <p className="text-xs text-text-secondary truncate">
              {user.name || t('unnamed')}{user.username ? ` · @${user.username}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">{t('templates')}</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((template) => (
                <button key={template} type="button" onClick={() => update(templateDraft(template))}
                  className="min-h-11 px-3 rounded-lg border border-border text-sm hover:bg-primary-50 hover:border-primary-200 transition-colors">
                  {t(template === 'receipt' ? 'templateReceipt' : template === 'badReceipt' ? 'templateBadReceipt' : 'templateConfirmed')}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-text-secondary">{t('titleLabel')}</span>
            <input value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={ADMIN_MESSAGE_TITLE_MAX}
              className="mt-1 w-full min-h-11 px-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300" />
          </label>

          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-text-secondary">
              {t('messageLabel')}
              <span className="tabular-nums">{draft.message.length}/{ADMIN_MESSAGE_TEXT_MAX}</span>
            </span>
            <textarea value={draft.message} onChange={(e) => update({ message: e.target.value })} maxLength={ADMIN_MESSAGE_TEXT_MAX} rows={5}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 resize-y" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-text-secondary">{t('linkLabel')}</span>
            <input value={draft.link} onChange={(e) => update({ link: e.target.value })} maxLength={ADMIN_MESSAGE_LINK_MAX} inputMode="url" placeholder="/pricing"
              className={`mt-1 w-full min-h-11 px-3 rounded-xl border focus:ring-2 focus:ring-primary-500/20 ${linkInvalid ? 'border-red-300' : 'border-border focus:border-primary-300'}`} />
            {linkInvalid && <span className="block mt-1 text-xs text-red-600">{t('linkInvalid')}</span>}
          </label>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <label className="flex items-center gap-2 min-h-11 text-sm">
              <input type="checkbox" checked={toSite} onChange={(e) => { setToSite(e.target.checked); setResult(null); }} className="h-5 w-5" />
              {t('channelSite')}
            </label>
            <label className={`flex items-center gap-2 min-h-11 text-sm ${user.hasTelegram ? '' : 'text-text-secondary'}`}>
              <input type="checkbox" checked={toTelegram} disabled={!user.hasTelegram} onChange={(e) => { setToTelegram(e.target.checked); setResult(null); }} className="h-5 w-5" />
              {t('channelTelegram')}
              {!user.hasTelegram && <span className="text-xs">({t('telegramNotLinked')})</span>}
            </label>
          </div>
          {noChannel && <p className="text-xs text-red-600">{t('noChannel')}</p>}

          {result && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm space-y-1" role="status">
              {result.site && <p className="text-green-700 flex items-center gap-1"><CheckCircle size={14} /> {t('resultSite')}</p>}
              {telegramStatus && (
                <p className={result.telegram === 'sent' ? 'text-green-700' : 'text-red-600'}>{t('resultTelegram', { status: telegramStatus })}</p>
              )}
            </div>
          )}
          {failed && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">{t('error')}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 min-h-11 rounded-xl border border-border text-sm font-medium hover:bg-gray-50">
            {t('close')}
          </button>
          <button type="button" onClick={send} disabled={!canSend}
            className="flex-1 min-h-11 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? t('sending') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
