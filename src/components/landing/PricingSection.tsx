'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Check, X, Crown, GraduationCap, Sparkles } from 'lucide-react';

export default function PricingSection() {
  const t = useTranslations('landing.pricing');

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

                <div className="flex items-baseline justify-center gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'gradient-text'}`}>
                    {t(`${plan.key}.price`)}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                    {t(`${plan.key}.period`)}
                  </span>
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

                {/* Discounts */}
                {plan.key !== 'free' && (
                  <div className={`text-xs mb-4 space-y-1 ${plan.popular ? 'text-white/70' : 'text-text-secondary'}`}>
                    <p>{t(`${plan.key}.discount6`)}</p>
                    <p>{t(`${plan.key}.discount12`)}</p>
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
