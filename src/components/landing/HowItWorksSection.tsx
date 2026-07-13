'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { UserPlus, ListChecks, TrendingUp } from 'lucide-react';

const steps = [
  { key: 'step1', icon: UserPlus, number: '01' },
  { key: 'step2', icon: ListChecks, number: '02' },
  { key: 'step3', icon: TrendingUp, number: '03' },
];

export default function HowItWorksSection() {
  const t = useTranslations('landing.howItWorks');

  return (
    <section className="py-20 gradient-bg">
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

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="text-center relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary-300 to-primary-100" />
                )}

                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-lg border border-primary-100 mb-6">
                  <Icon size={36} className="text-primary-600" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {t(`${step.key}.title`)}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t(`${step.key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
