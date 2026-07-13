'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Calculator, Video, Bot, Trophy, Smartphone, Globe 
} from 'lucide-react';

const features = [
  { key: 'latex', icon: Calculator, color: 'from-blue-500 to-blue-600' },
  { key: 'video', icon: Video, color: 'from-red-500 to-red-600' },
  { key: 'ai', icon: Bot, color: 'from-green-500 to-green-600' },
  { key: 'rating', icon: Trophy, color: 'from-yellow-500 to-yellow-600' },
  { key: 'mobile', icon: Smartphone, color: 'from-purple-500 to-purple-600' },
  { key: 'multilang', icon: Globe, color: 'from-pink-500 to-pink-600' },
];

export default function FeaturesSection() {
  const t = useTranslations('landing.features');

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

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 group hover:border-primary-200"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {t(`${feature.key}.title`)}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`${feature.key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
