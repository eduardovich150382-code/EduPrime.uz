'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Bell, CheckCircle, AlertCircle, Loader2,
  Users, Crown, GraduationCap, Sparkles, Clock, FileText,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

// Shablonlar
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

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
        setResult({ success: true, message: `${data.notifiedCount} ta foydalanuvchiga xabar yuborildi!` });
        setTitle(''); setMessage(''); setLink(''); setType('info');
        // Refresh history
        fetch('/api/admin/notifications/history').then(r => r.json()).then(d => { if (d.history) setHistory(d.history); });
      } else {
        setResult({ success: false, message: data.error || 'Xatolik yuz berdi' });
      }
    } catch {
      setResult({ success: false, message: 'Server bilan bog\'lanishda xatolik' });
    }
    setSending(false);
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setTitle(t.title);
    setMessage(t.message);
    setLink(t.link);
    setActiveTab('send');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Bell size={24} className="text-primary-600" />
          Xabar yuborish
        </h1>
        <p className="text-sm text-text-secondary mt-1">Maqsadli yoki umumiy bildirishnoma</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'send' as const, label: 'Yuborish', icon: Send },
          { key: 'history' as const, label: 'Tarix', icon: Clock },
          { key: 'templates' as const, label: 'Shablonlar', icon: FileText },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
              <label className="block text-sm font-medium text-text-primary mb-2">Kimga yuborish</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { key: 'all' as TargetAudience, label: 'Hammaga', icon: Users, color: 'bg-gray-50 border-gray-200 text-gray-700' },
                  { key: 'free' as TargetAudience, label: 'Bepul', icon: Sparkles, color: 'bg-green-50 border-green-200 text-green-700' },
                  { key: 'premium' as TargetAudience, label: 'Premium', icon: Crown, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                  { key: 'teacher' as TargetAudience, label: 'Ustoz', icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                ]).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTarget(t.key)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      target === t.key ? t.color + ' ring-2 ring-offset-1 ring-primary-300' : 'bg-white border-border text-text-secondary'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Xabar turi</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'info', label: "Ma'lumot", color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { value: 'success', label: 'Muvaffaqiyat', color: 'bg-green-50 border-green-200 text-green-700' },
                  { value: 'warning', label: 'Ogohlantirish', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                  { value: 'reminder', label: 'Eslatma', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                ].map((t) => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${type === t.value ? t.color + ' ring-2 ring-offset-1 ring-primary-300' : 'bg-white border-border text-text-secondary'}`}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Sarlavha *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Yangi testlar qo'shildi!" required
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all" />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Xabar matni *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Bugun 5 ta yangi DTM test qo'shildi. Hoziroq yechib ko'ring!" rows={3} required
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all resize-none" />
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Havola (ixtiyoriy)</label>
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
              {sending ? <><Loader2 size={18} className="animate-spin" /> Yuborilmoqda...</> : <><Send size={18} /> Yuborish</>}
            </button>
          </form>
        </motion.div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Yuborilgan xabarlar tarixi</h2>
          {historyLoading ? (
            <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-primary-600 mx-auto" /></div>
          ) : history.length === 0 ? (
            <p className="text-center text-text-secondary py-8 text-sm">Hali xabar yuborilmagan</p>
          ) : (
            <div className="space-y-3">
              {history.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-background border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
                    <span className="text-[10px] text-text-secondary">{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{item.message}</p>
                  <span className="text-[10px] text-primary-600 mt-1 inline-block">{item.count} ta foydalanuvchiga</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Tayyor shablonlar</h2>
          <div className="space-y-3">
            {TEMPLATES.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-text-primary">{t.title}</h4>
                  <p className="text-xs text-text-secondary truncate">{t.message}</p>
                </div>
                <button onClick={() => applyTemplate(t)}
                  className="ml-3 px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 text-xs font-medium hover:bg-primary-200 transition-colors flex-shrink-0">
                  Tanlash
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-4">Shablonni tanlaganingizda &quot;Yuborish&quot; tabiga o&apos;tadi va ma&apos;lumotlar to&apos;ldiriladi.</p>
        </motion.div>
      )}
    </div>
  );
}
