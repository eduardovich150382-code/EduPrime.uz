'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Crown, GraduationCap, Sparkles, Send, Loader2 } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

type DurationKey = '1month' | '3months' | '6months' | '1year';

const DURATION_LABELS: Record<DurationKey, string> = {
  '1month': '1 oy',
  '3months': '3 oy',
  '6months': '6 oy',
  '1year': '1 yil',
};

// Default prices (fallback if API fails)
const DEFAULT_PREMIUM_PRICES: Record<DurationKey, number> = {
  '1month': 29000,
  '3months': 79000,
  '6months': 150000,
  '1year': 270000,
};

const DEFAULT_TEACHER_PRICES: Record<DurationKey, number> = {
  '1month': 49000,
  '3months': 129000,
  '6months': 240000,
  '1year': 430000,
};

export default function PricingPage() {
  const t = useTranslations('landing.pricing');
  const [selectedDuration, setSelectedDuration] = useState<Record<string, DurationKey>>({
    premium: '1month',
    ustoz: '1month',
  });
  const [premiumPrices, setPremiumPrices] = useState<Record<DurationKey, number>>(DEFAULT_PREMIUM_PRICES);
  const [teacherPrices, setTeacherPrices] = useState<Record<DurationKey, number>>(DEFAULT_TEACHER_PRICES);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Load dynamic prices from the settings API
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setPremiumPrices({
            '1month': parseInt(s.premium_price_1_month) || DEFAULT_PREMIUM_PRICES['1month'],
            '3months': parseInt(s.premium_price_3_months) || DEFAULT_PREMIUM_PRICES['3months'],
            '6months': parseInt(s.premium_price_6_months) || DEFAULT_PREMIUM_PRICES['6months'],
            '1year': parseInt(s.premium_price_1_year) || DEFAULT_PREMIUM_PRICES['1year'],
          });
          setTeacherPrices({
            '1month': parseInt(s.teacher_price_1_month) || DEFAULT_TEACHER_PRICES['1month'],
            '3months': parseInt(s.teacher_price_3_months) || DEFAULT_TEACHER_PRICES['3months'],
            '6months': parseInt(s.teacher_price_6_months) || DEFAULT_TEACHER_PRICES['6months'],
            '1year': parseInt(s.teacher_price_1_year) || DEFAULT_TEACHER_PRICES['1year'],
          });
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
      setLoadingPrices(false);
    };
    fetchPrices();
  }, []);

  const getPriceForPlan = (planKey: string, duration: DurationKey) => {
    if (planKey === 'premium') return premiumPrices[duration];
    if (planKey === 'ustoz') return teacherPrices[duration];
    return 0;
  };

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

  const durations: DurationKey[] = ['1month', '3months', '6months', '1year'];

  // Calculate savings percentage
  const getSavings = (planKey: string, duration: DurationKey) => {
    if (duration === '1month') return 0;
    const monthlyPrice = getPriceForPlan(planKey, '1month');
    const totalPrice = getPriceForPlan(planKey, duration);
    const months = duration === '3months' ? 3 : duration === '6months' ? 6 : 12;
    const withoutDiscount = monthlyPrice * months;
    if (withoutDiscount <= 0) return 0;
    return Math.round(((withoutDiscount - totalPrice) / withoutDiscount) * 100);
  };

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

      {/* Loading indicator */}
      {loadingPrices && (
        <div className="text-center">
          <Loader2 size={20} className="animate-spin text-primary-600 mx-auto" />
        </div>
      )}

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
                  <div className={`inline-flex rounded-xl p-1 gap-0.5 flex-wrap justify-center ${plan.popular ? 'bg-white/10' : 'bg-gray-100'}`}>
                    {durations.map((dur) => {
                      const isSelected = selectedDuration[plan.key] === dur;
                      const savings = getSavings(plan.key, dur);
                      return (
                        <button
                          key={dur}
                          onClick={() => setSelectedDuration(prev => ({ ...prev, [plan.key]: dur }))}
                          className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                          {savings > 0 && isSelected && (
                            <span className={`absolute -top-2 -right-1 text-[9px] px-1 rounded-full font-bold ${
                              plan.popular ? 'bg-green-400 text-green-900' : 'bg-green-500 text-white'
                            }`}>
                              -{savings}%
                            </span>
                          )}
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
                      {getPriceForPlan(plan.key, selectedDuration[plan.key] || '1month').toLocaleString()}
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

              {/* Per month breakdown for multi-month plans */}
              {plan.key !== 'free' && selectedDuration[plan.key] !== '1month' && (
                <p className={`text-xs mb-4 ${plan.popular ? 'text-white/60' : 'text-text-secondary'}`}>
                  ≈ {Math.round(getPriceForPlan(plan.key, selectedDuration[plan.key]) / 
                    (selectedDuration[plan.key] === '3months' ? 3 : selectedDuration[plan.key] === '6months' ? 6 : 12)
                  ).toLocaleString()} so&apos;m/oy
                </p>
              )}

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

              {/* Dynamic discount info */}
              {plan.key !== 'free' && (
                <div className={`text-xs mb-4 space-y-1 ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                  <p>3 oy — {getPriceForPlan(plan.key, '3months').toLocaleString()} so&apos;m</p>
                  <p>6 oy — {getPriceForPlan(plan.key, '6months').toLocaleString()} so&apos;m</p>
                  <p>1 yil — {getPriceForPlan(plan.key, '1year').toLocaleString()} so&apos;m</p>
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
