'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Check, Crown, GraduationCap, Sparkles } from 'lucide-react';

type DurationKey = '1month' | '3months' | '6months' | '1year';

const DURATION_LABELS: Record<DurationKey, string> = {
  '1month': '1 oy',
  '3months': '3 oy',
  '6months': '6 oy',
  '1year': '1 yil',
};

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

export default function PricingSection() {
  const t = useTranslations('landing.pricing');
  const [premiumPrices, setPremiumPrices] = useState(DEFAULT_PREMIUM_PRICES);
  const [teacherPrices, setTeacherPrices] = useState(DEFAULT_TEACHER_PRICES);
  const [selectedDuration, setSelectedDuration] = useState<Record<string, DurationKey>>({
    premium: '1month',
    ustoz: '1month',
  });

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
    };
    fetchPrices();
  }, []);

  const getPriceForPlan = (planKey: string, duration: DurationKey) => {
    if (planKey === 'premium') return premiumPrices[duration];
    if (planKey === 'ustoz') return teacherPrices[duration];
    return 0;
  };

  const plans = [
    {
      key: 'free',
      icon: Sparkles,
      popular: false,
      gradient: false,
    },
    {
      key: 'premium',
      icon: Crown,
      popular: true,
      gradient: true,
    },
    {
      key: 'ustoz',
      icon: GraduationCap,
      popular: false,
      gradient: false,
    },
  ];

  const durations: DurationKey[] = ['1month', '3months', '6months', '1year'];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-500/30 scale-105'
                  : 'bg-white border-2 border-border hover:border-primary-200'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
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
                        return (
                          <button
                            key={dur}
                            onClick={() => setSelectedDuration(prev => ({ ...prev, [plan.key]: dur }))}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
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
                      <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'gradient-text'}`}>
                        {getPriceForPlan(plan.key, selectedDuration[plan.key] || '1month').toLocaleString()}
                      </span>
                      <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                        so&apos;m / {DURATION_LABELS[selectedDuration[plan.key] || '1month']}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'gradient-text'}`}>
                        {t(`${plan.key}.price`)}
                      </span>
                      <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                        {t(`${plan.key}.period`)}
                      </span>
                    </>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-8 text-left">
                  {(t.raw(`${plan.key}.features`) as string[]).map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={18} className={`mt-0.5 flex-shrink-0 ${plan.popular ? 'text-green-300' : 'text-green-500'}`} />
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

                {/* CTA */}
                <Link
                  href="/login"
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-all duration-300 ${
                    plan.popular
                      ? 'bg-white text-primary-600 hover:bg-gray-100 shadow-lg'
                      : 'btn-primary'
                  }`}
                >
                  {t(`${plan.key}.cta`)}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-text-secondary mt-8"
        >
          Ikkala tarifni birga olsangiz — BARCHA testlarga cheksiz ruxsat!
        </motion.p>
      </div>
    </section>
  );
}
