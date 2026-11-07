'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Bell, CheckCircle, AlertCircle, Loader2,
  Users, Crown, GraduationCap, Sparkles, Clock, FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/ui/BackButton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

// Shablonlar — foydalanuvchilarga ketadigan xabar matni (auditoriya o'zbekzabon),
// admin interfeysi tiliga qarab tarjima qilinmaydi.
const TEMPLATES = [
  { title: 'Yangi testlar qo\'shildi!', message: 'Bugun yangi testlar qo\'shildi. Hoziroq yechib ko\'ring!', link: '/tests' },
  { title: 'Premium aksiya!', message: 'Bugun Premium tarifga o\'ting — 20% chegirma!', link: '/pricing' },
  { title: 'Obuna muddati', message: 'Sizning obunangiz tez orada tugaydi. Uzaytiring!', link: '/pricing' },
  { title: 'Yangi fan qo\'shildi', message: 'Yangi fan testlari qo\'shildi. Ko\'ring!', link: '/tests' },
];

interface HistoryItem {
  title: string;
  message: string;
  type: string;
  createdAt: string;
  count: number;
}

type TargetAudience = 'all' | 'free' | 'premium' | 'teacher';

export default function AdminNotificationsPage() {
  const t = useTranslations('adminNotifications');
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState('info');
  const [target, setTarget] = useState<TargetAudience>('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates'>('send');

  // Fetch notification history
  useEffect(() => {
    fetch('/api/admin/notifications/history')
      .then(r => r.json())
      .then(data => { if (data.history) setHistory(data.history); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Forma yuborilganda darhol jo'natilmaydi — ommaviy xabarni qaytarib bo'lmaydi,
  // shuning uchun avval auditoriya ko'rsatilgan tasdiq oynasi chiqadi.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setConfirming(true);
  }

  async function send() {
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, link: link || undefined, type, target }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: t('sent', { count: data.notifiedCount }) });
        setTitle(''); setMessage(''); setLink(''); setType('info');
        // Refresh history
        fetch('/api/admin/notifications/history').then(r => r.json()).then(d => { if (d.history) setHistory(d.history); });
      } else {
        setResult({ success: false, message: data.error || t('error') });
      }
    } catch {
      setResult({ success: false, message: t('networkError') });
    }
    setSending(false);
    setConfirming(false);
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setTitle(t.title);
    setMessage(t.message);
    setLink(t.link);
    setActiveTab('send');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton className="mb-2 min-h-11" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Bell size={24} className="text-primary-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary mt-1">{t('subtitle')}</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'send' as const, label: t('tabs.send'), icon: Send },
          { key: 'history' as const, label: t('tabs.history'), icon: Clock },
          { key: 'templates' as const, label: t('tabs.templates'), icon: FileText },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
            aria-pressed={activeTab === tab.key}
            className={`flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEND TAB */}
      {activeTab === 'send' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Target audience */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('audience')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { key: 'all' as TargetAudience, icon: Users, color: 'bg-gray-50 border-gray-200 text-gray-700' },
                  { key: 'free' as TargetAudience, icon: Sparkles, color: 'bg-green-50 border-green-200 text-green-700' },
                  { key: 'premium' as TargetAudience, icon: Crown, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                  { key: 'teacher' as TargetAudience, icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                ]).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={target === item.key}
                    onClick={() => setTarget(item.key)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      target === item.key ? item.color + ' ring-2 ring-offset-1 ring-primary-300' : 'bg-white border-border text-text-secondary'
                    }`}
                  >
                    <item.icon size={14} aria-hidden />
                    {t(`targets.${item.key}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('type')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'info', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { value: 'success', color: 'bg-green-50 border-green-200 text-green-700' },
                  { value: 'warning', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                  { value: 'reminder', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                ].map((item) => (
                  <button key={item.value} type="button" aria-pressed={type === item.value} onClick={() => setType(item.value)}
                    className={`min-h-11 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${type === item.value ? item.color + ' ring-2 ring-offset-1 ring-primary-300' : 'bg-white border-border text-text-secondary'}`}
                  >{t(`types.${item.value}`)}</button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('fieldTitle')}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Yangi testlar qo'shildi!" required
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all" />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('fieldMessage')}</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Bugun 5 ta yangi DTM test qo'shildi. Hoziroq yechib ko'ring!" rows={3} required
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all resize-none" />
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('fieldLink')}</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                placeholder="/tests yoki https://..."
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all" />
            </div>

            {result && (
              <div className={`flex items-center gap-2 p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {result.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-medium">{result.message}</span>
              </div>
            )}

            <button type="submit" disabled={sending || !title.trim() || !message.trim()}
              className="w-full btn-primary !py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {sending ? <><Loader2 size={18} className="animate-spin" aria-hidden /> {t('sending')}</> : <><Send size={18} aria-hidden /> {t('tabs.send')}</>}
            </button>
          </form>
        </motion.div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">{t('historyTitle')}</h2>
          {historyLoading ? (
            <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-primary-600 mx-auto" /></div>
          ) : history.length === 0 ? (
            <p className="text-center text-text-secondary py-8 text-sm">{t('historyEmpty')}</p>
          ) : (
            <div className="space-y-3">
              {history.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-background border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
                    <span className="text-[10px] text-text-secondary">{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{item.message}</p>
                  <span className="text-[10px] text-primary-600 mt-1 inline-block">{t('recipients', { count: item.count })}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">{t('templatesTitle')}</h2>
          <div className="space-y-3">
            {TEMPLATES.map((template, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-text-primary">{template.title}</h4>
                  <p className="text-xs text-text-secondary truncate">{template.message}</p>
                </div>
                <button type="button" onClick={() => applyTemplate(template)}
                  className="ml-3 min-h-11 px-3 rounded-lg bg-primary-100 text-primary-700 text-xs font-medium hover:bg-primary-200 transition-colors flex-shrink-0">
                  {t('useTemplate')}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-4">{t('templatesHelp')}</p>
        </motion.div>
      )}

      {confirming && (
        <ConfirmDialog
          title={t('confirmTitle')}
          body={<>
            <p>{t('confirmBody', { audience: t(`targets.${target}`) })}</p>
            <p className="mt-2 font-medium text-text-primary break-words">{title}</p>
          </>}
          confirmLabel={t('confirmSend')}
          busy={sending}
          onConfirm={() => void send()}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
