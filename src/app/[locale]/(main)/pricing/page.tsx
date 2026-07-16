'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Crown, GraduationCap, Sparkles, Send } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

type DurationKey = '1month' | '6months' | '1year';

const DURATION_PRICES: Record<DurationKey, number> = {
  '1month': 29000,
  '6months': 150000,
  '1year': 270000,
};

const DURATION_LABELS: Record<DurationKey, string> = {
  '1month': '1 oy',
  '6months': '6 oy',
  '1year': '1 yil',
};

export default function PricingPage() {
  const t = useTranslations('landing.pricing');
  const [selectedDuration, setSelectedDuration] = useState<Record<string, DurationKey>>({
    premium: '1month',
    ustoz: '1month',
  });

  const handleBuy = (plan: string) => {
    const duration = selectedDuration[plan] || '1month';
    const deepLink = `https://t.me/EduPrimeuzbot?start=buy_${plan === 'ustoz' ? 'teacher' : plan}_${duration}`;
    window.open(deepLink, '_blank');
  };

  const plans = [
    {
      key: 'free',
      icon: Sparkles,
      popular: false,
    },
    {
      key: 'premium',
      icon: Crown,
      popular: true,
    },
    {
      key: 'ustoz',
      icon: GraduationCap,
      popular: false,
    },
  ];

  const durations: DurationKey[] = ['1month', '6months', '1year'];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <BackButton className="mb-2" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary mt-2">{t('subtitle')}</p>
      </motion.div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`relative rounded-2xl p-7 ${
              plan.popular
                ? 'bg-gradient-to-b from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-500/30 scale-105'
                : 'bg-white border-2 border-border'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                MASHHUR
              </div>
            )}

            <div className="text-center">
              <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                plan.popular ? 'bg-white/20' : 'bg-primary-100'
              }`}>
                <plan.icon size={24} className={plan.popular ? 'text-white' : 'text-primary-600'} />
              </div>

              <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-text-primary'}`}>
                {t(`${plan.key}.title`)}
              </h3>

              {/* Duration selector for paid plans */}
              {plan.key !== 'free' && (
                <div className="mb-4">
                  <div className={`inline-flex rounded-xl p-1 gap-1 ${plan.popular ? 'bg-white/10' : 'bg-gray-100'}`}>
                    {durations.map((dur) => {
                      const isSelected = selectedDuration[plan.key] === dur;
                      return (
                        <button
                          key={dur}
                          onClick={() => setSelectedDuration(prev => ({ ...prev, [plan.key]: dur }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? plan.popular
                                ? 'bg-white text-primary-700 shadow-sm'
                                : 'bg-primary-600 text-white shadow-sm'
                              : plan.popular
                                ? 'text-white/70 hover:text-white'
                                : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {DURATION_LABELS[dur]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-baseline justify-center gap-1 mb-6">
                {plan.key !== 'free' ? (
                  <>
                    <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'gradient-text'}`}>
                      {DURATION_PRICES[selectedDuration[plan.key] || '1month'].toLocaleString()}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                      so&apos;m / {DURATION_LABELS[selectedDuration[plan.key] || '1month']}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'gradient-text'}`}>
                      {t(`${plan.key}.price`)}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                      {t(`${plan.key}.period`)}
                    </span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-left">
                {(t.raw(`${plan.key}.features`) as string[]).map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={16} className={`mt-0.5 flex-shrink-0 ${plan.popular ? 'text-green-300' : 'text-green-500'}`} />
                    <span className={`text-sm ${plan.popular ? 'text-white/90' : 'text-text-secondary'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.key !== 'free' && (
                <div className={`text-xs mb-4 space-y-1 ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                  <p>{t(`${plan.key}.discount6`)}</p>
                  <p>{t(`${plan.key}.discount12`)}</p>
                </div>
              )}

              <button
                onClick={() => plan.key !== 'free' && handleBuy(plan.key)}
                className={`w-full py-3 rounded-xl font-semibold text-center transition-all duration-300 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-white text-primary-600 hover:bg-gray-100'
                    : plan.key === 'free' ? 'bg-gray-100 text-text-secondary cursor-default' : 'btn-primary'
                }`}
              >
                {plan.key !== 'free' && <Send size={16} />}
                {t(`${plan.key}.cta`)}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-text-secondary card p-4"
      >
        <p>💡 To&apos;lov Telegram bot (@EduPrimeuzbot) orqali amalga oshiriladi. Ikkala tarifni birga olsangiz - BARCHA testlarga ruxsat!</p>
      </motion.div>
    </div>
  );
}
