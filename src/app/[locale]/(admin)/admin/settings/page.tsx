'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, CreditCard, MessageCircle, DollarSign,
  Megaphone, Loader2, Check, AlertCircle, Crown, GraduationCap,
  Users, Bell, Bot,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface SettingsForm {
  // To'lov ma'lumotlari
  payment_card_number: string;
  payment_card_owner: string;
  // Premium narxlari
  premium_price_1_month: string;
  premium_price_3_months: string;
  premium_price_6_months: string;
  premium_price_1_year: string;
  // Ustoz tarifi narxlari
  teacher_price_1_month: string;
  teacher_price_3_months: string;
  teacher_price_6_months: string;
  teacher_price_1_year: string;
  // Boshqa sozlamalar
  telegram_support_username: string;
  site_announcement: string;
  referral_friends_required: string;
  referral_reward_days: string;
  free_daily_test_limit: string;
  subscription_alert_days: string;
  bot_welcome_message: string;
}

interface SettingsGroup {
  title: string;
  icon: any;
  description: string;
  fields: { key: keyof SettingsForm; label: string; placeholder: string; icon: any; type?: string; suffix?: string }[];
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "To'lov ma'lumotlari",
    icon: CreditCard,
    description: "Foydalanuvchilarga ko'rsatiladigan karta ma'lumotlari",
    fields: [
      { key: 'payment_card_number', label: 'Karta raqami', placeholder: '8600 1234 5678 9012', icon: CreditCard },
      { key: 'payment_card_owner', label: 'Karta egasi', placeholder: 'ALISHER KARIMOV', icon: CreditCard },
    ],
  },
  {
    title: 'Premium tarif narxlari',
    icon: Crown,
    description: "Premium obuna narxlari (so'mda). O'zgarishlar tarif sahifasida darhol ko'rinadi",
    fields: [
      { key: 'premium_price_1_month', label: '1 oylik', placeholder: '29000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'premium_price_3_months', label: '3 oylik', placeholder: '79000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'premium_price_6_months', label: '6 oylik', placeholder: '150000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'premium_price_1_year', label: '1 yillik', placeholder: '270000', icon: DollarSign, type: 'number', suffix: "so'm" },
    ],
  },
  {
    title: 'Ustoz tarifi narxlari',
    icon: GraduationCap,
    description: "O'qituvchilar uchun tarif narxlari (so'mda). O'zgarishlar tarif sahifasida darhol ko'rinadi",
    fields: [
      { key: 'teacher_price_1_month', label: '1 oylik', placeholder: '49000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'teacher_price_3_months', label: '3 oylik', placeholder: '129000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'teacher_price_6_months', label: '6 oylik', placeholder: '240000', icon: DollarSign, type: 'number', suffix: "so'm" },
      { key: 'teacher_price_1_year', label: '1 yillik', placeholder: '430000', icon: DollarSign, type: 'number', suffix: "so'm" },
    ],
  },
  {
    title: 'Referral tizimi',
    icon: Users,
    description: "Do'stlarni taklif qilish tizimi sozlamalari",
    fields: [
      { key: 'referral_friends_required', label: "Nechta do'st taklif qilish kerak", placeholder: '3', icon: Users, type: 'number' },
      { key: 'referral_reward_days', label: 'Mukofot: necha kun premium', placeholder: '5', icon: DollarSign, type: 'number' },
    ],
  },
  {
    title: 'Test sozlamalari',
    icon: AlertCircle,
    description: "Bepul foydalanuvchilar uchun test limitlari",
    fields: [
      { key: 'free_daily_test_limit', label: 'Kunlik bepul test limiti', placeholder: '3', icon: DollarSign, type: 'number' },
    ],
  },
  {
    title: 'Bildirishnomalar',
    icon: Bell,
    description: "Obuna tugashi va bot xabarlari",
    fields: [
      { key: 'subscription_alert_days', label: "Ogohlantirish kunlari (vergul bilan)", placeholder: '7,3,1', icon: Bell },
      { key: 'telegram_support_username', label: "Telegram qo'llab-quvvatlash", placeholder: '@EduPrimeuz_support', icon: MessageCircle },
    ],
  },
  {
    title: 'Bot va sayt xabarlari',
    icon: Bot,
    description: "Telegram bot va sayt e'lonlari",
    fields: [
      { key: 'bot_welcome_message', label: 'Bot: xush kelibsiz xabari', placeholder: "Salom! EduPrime.uz ga xush kelibsiz!", icon: Bot },
      { key: 'site_announcement', label: "Sayt e'loni (barcha foydalanuvchilarga)", placeholder: "Yangi funksiyalar qo'shildi!", icon: Megaphone },
    ],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>({
    payment_card_number: '',
    payment_card_owner: '',
    premium_price_1_month: '29000',
    premium_price_3_months: '79000',
    premium_price_6_months: '150000',
    premium_price_1_year: '270000',
    teacher_price_1_month: '49000',
    teacher_price_3_months: '129000',
    teacher_price_6_months: '240000',
    teacher_price_1_year: '430000',
    telegram_support_username: '',
    site_announcement: '',
    referral_friends_required: '3',
    referral_reward_days: '5',
    free_daily_test_limit: '3',
    subscription_alert_days: '7,3,1',
    bot_welcome_message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SettingsForm | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) {
          const merged = { ...settings, ...data.settings };
          setSettings(merged);
          setOriginalSettings(merged);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError("Sozlamalarni yuklashda xatolik yuz berdi");
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setError('');
    setHasChanges(true);
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
        setHasChanges(false);
        setOriginalSettings({ ...settings });
        setTimeout(() => setSaved(false), 4000);
      } else {
        setError(data.error || 'Saqlashda xatolik');
      }
    } catch (err) {
      setError('Server bilan aloqa o\'rnatilmadi');
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
      setError('');
    }
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
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <BackButton className="mb-2" />
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
          To&apos;lov ma&apos;lumotlari, narxlar va boshqa sozlamalarni boshqaring. Saqlangan o&apos;zgarishlar saytda darhol ko&apos;rinadi.
        </p>
      </motion.div>

      {/* Settings groups */}
      {settingsGroups.map((group, groupIndex) => {
        const GroupIcon = group.icon;
        return (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * groupIndex }}
            className="card p-4 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                <GroupIcon size={18} className="text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary text-sm">{group.title}</h2>
                <p className="text-xs text-text-secondary">{group.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.fields.map((field) => {
                const Icon = field.icon;
                const isTextarea = field.key === 'site_announcement' || field.key === 'bot_welcome_message';
                return (
                  <div key={field.key} className={`space-y-1.5 ${isTextarea ? 'sm:col-span-2' : ''}`}>
                    <label className="flex items-center gap-2 text-xs font-medium text-text-primary">
                      <Icon size={14} className="text-primary-500 shrink-0" />
                      {field.label}
                    </label>
                    {isTextarea ? (
                      <textarea
                        value={settings[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm resize-none"
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type || 'text'}
                          value={settings[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm ${field.suffix ? 'pr-14' : ''}`}
                        />
                        {field.suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                            {field.suffix}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Sticky Save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary flex items-center justify-center gap-2 !py-2.5 text-sm disabled:opacity-50 flex-1 sm:flex-none"
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

          {hasChanges && !saving && (
            <button
              onClick={handleReset}
              className="btn-ghost text-sm !py-2.5"
            >
              Bekor qilish
            </button>
          )}

          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          {saved && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 text-sm text-green-600"
            >
              <Check size={14} />
              Sozlamalar muvaffaqiyatli saqlandi. O&apos;zgarishlar saytda ko&apos;rinadi.
            </motion.p>
          )}

          {!hasChanges && !saved && !error && (
            <p className="text-xs text-text-secondary">
              Barcha sozlamalar saqlangan
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-4 sm:p-6 bg-blue-50/50 border-blue-100"
      >
        <h3 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Eslatma
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Karta raqami to&apos;lov sahifasida ko&apos;rsatiladi</li>
          <li>Narxlar so&apos;mda kiritiladi (masalan: 29000)</li>
          <li>Narx o&apos;zgarishlari tariflar sahifasida darhol ko&apos;rinadi</li>
          <li>Sayt e&apos;loni barcha foydalanuvchilarga ko&apos;rsatiladi</li>
          <li>Telegram username @ belgisi bilan kiritilsin</li>
          <li>Obuna ogohlantirish kunlari vergul bilan ajratiladi (masalan: 7,3,1)</li>
        </ul>
      </motion.div>
    </div>
  );
}
