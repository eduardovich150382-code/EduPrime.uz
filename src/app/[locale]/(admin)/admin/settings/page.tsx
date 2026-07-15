'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, CreditCard, MessageCircle, DollarSign,
  Megaphone, Loader2, Check, AlertCircle,
} from 'lucide-react';

interface SettingsForm {
  payment_card_number: string;
  payment_card_owner: string;
  premium_price_1_month: string;
  premium_price_6_months: string;
  premium_price_1_year: string;
  telegram_support_username: string;
  site_announcement: string;
}

const settingsMeta: { key: keyof SettingsForm; label: string; placeholder: string; icon: any; type?: string }[] = [
  { key: 'payment_card_number', label: 'Karta raqami', placeholder: '8600 1234 5678 9012', icon: CreditCard },
  { key: 'payment_card_owner', label: 'Karta egasi', placeholder: 'ALISHER KARIMOV', icon: CreditCard },
  { key: 'premium_price_1_month', label: 'Premium narx (1 oy)', placeholder: '29000', icon: DollarSign, type: 'number' },
  { key: 'premium_price_6_months', label: 'Premium narx (6 oy)', placeholder: '150000', icon: DollarSign, type: 'number' },
  { key: 'premium_price_1_year', label: 'Premium narx (1 yil)', placeholder: '270000', icon: DollarSign, type: 'number' },
  { key: 'telegram_support_username', label: 'Telegram qo\'llab-quvvatlash', placeholder: '@EduPrimeuz_support', icon: MessageCircle },
  { key: 'site_announcement', label: 'Sayt e\'loni', placeholder: 'Yangi funksiyalar qo\'shildi!', icon: Megaphone },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>({
    payment_card_number: '',
    payment_card_owner: '',
    premium_price_1_month: '29000',
    premium_price_6_months: '150000',
    premium_price_1_year: '270000',
    telegram_support_username: '',
    site_announcement: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Saqlashda xatolik');
      }
    } catch (err) {
      setError('Server xatolik');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
        <p className="text-text-secondary text-sm">Sozlamalar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Settings size={24} className="text-primary-600" />
          Tizim sozlamalari
        </h1>
        <p className="text-text-secondary mt-1">
          To&apos;lov ma&apos;lumotlari, narxlar va boshqa sozlamalarni boshqaring
        </p>
      </motion.div>

      {/* Settings form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-4 sm:p-6 space-y-4 sm:space-y-5"
      >
        {settingsMeta.map((meta) => {
          const Icon = meta.icon;
          return (
            <div key={meta.key} className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Icon size={16} className="text-primary-600 shrink-0" />
                {meta.label}
              </label>
              {meta.key === 'site_announcement' ? (
                <textarea
                  value={settings[meta.key]}
                  onChange={(e) => handleChange(meta.key, e.target.value)}
                  placeholder={meta.placeholder}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm resize-none"
                />
              ) : (
                <input
                  type={meta.type || 'text'}
                  value={settings[meta.key]}
                  onChange={(e) => handleChange(meta.key, e.target.value)}
                  placeholder={meta.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                />
              )}
            </div>
          );
        })}

        {/* Save button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center justify-center gap-2 !py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi!' : 'Saqlash'}
          </button>

          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          {saved && (
            <p className="flex items-center gap-1 text-sm text-green-600">
              <Check size={14} />
              Sozlamalar muvaffaqiyatli saqlandi
            </p>
          )}
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-4 sm:p-6 bg-blue-50/50 border-blue-100"
      >
        <h3 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Eslatma
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Karta raqami to&apos;lov sahifasida ko&apos;rsatiladi</li>
          <li>Narxlar so&apos;mda kiritiladi (masalan: 29000)</li>
          <li>Sayt e&apos;loni barcha foydalanuvchilarga ko&apos;rsatiladi</li>
          <li>Telegram username @ belgisi bilan kiritilsin</li>
        </ul>
      </motion.div>
    </div>
  );
}
