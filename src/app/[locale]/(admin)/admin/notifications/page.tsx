'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Send,
  Shield,
  Bell,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (userRole !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Shield size={64} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Ruxsat yo&apos;q</h1>
        <p className="text-text-secondary mb-6">
          Bu sahifa faqat adminlar uchun.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Dashboard ga qaytish
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, link: link || undefined, type }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `${data.notifiedCount} ta foydalanuvchiga xabar yuborildi!`,
        });
        setTitle('');
        setMessage('');
        setLink('');
        setType('info');
      } else {
        setResult({
          success: false,
          message: data.error || 'Xatolik yuz berdi',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Server bilan bog\'lanishda xatolik',
      });
    }

    setSending(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link
          href="/admin"
          className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bell size={24} className="text-primary-600" />
            Xabar yuborish
          </h1>
          <p className="text-sm text-text-secondary">
            Barcha foydalanuvchilarga bildirishnoma yuborish
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Xabar turi
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'info', label: 'Ma\'lumot', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { value: 'success', label: 'Muvaffaqiyat', color: 'bg-green-50 border-green-200 text-green-700' },
                { value: 'warning', label: 'Ogohlantirish', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                { value: 'reminder', label: 'Eslatma', color: 'bg-purple-50 border-purple-200 text-purple-700' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    type === t.value
                      ? t.color + ' ring-2 ring-offset-1 ring-primary-300'
                      : 'bg-white border-border text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Sarlavha *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yangi testlar qo'shildi!"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Xabar matni *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bugun 5 ta yangi DTM test qo'shildi. Hoziroq yechib ko'ring!"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none"
              required
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Havola (ixtiyoriy)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/tests yoki https://..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
            />
            <p className="text-xs text-text-secondary mt-1">
              Masalan: /tests, /pricing, /dashboard
            </p>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`flex items-center gap-2 p-4 rounded-xl ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {result.success ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-medium">{result.message}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full btn-primary !py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Send size={18} />
                Barchaga yuborish
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-5 bg-blue-50 border-blue-100"
      >
        <p className="text-sm text-blue-700">
          <strong>Eslatma:</strong> Xabar barcha foydalanuvchilarga bildirishnoma sifatida
          yuboriladi. Telegram ulagan foydalanuvchilarga bot orqali ham xabar boradi.
        </p>
      </motion.div>
    </div>
  );
}
