'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { 
  GraduationCap, School, Award, Globe2, Atom, FileCheck, ArrowRight, Lock 
} from 'lucide-react';

const testTypes = [
  { key: 'dtm', icon: GraduationCap, badge: 'Premium', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'school', icon: School, badge: 'Premium', color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'attestation', icon: Award, badge: 'Ustoz', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { key: 'sat', icon: Globe2, badge: 'Ustoz', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: 'gre', icon: Atom, badge: 'Ustoz', color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'certificate', icon: FileCheck, badge: 'Premium / Ustoz', color: 'bg-teal-50 text-teal-600 border-teal-200' },
];

export default function TestTypesSection() {
  const t = useTranslations('landing.testTypes');

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

        {/* Test types grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-elevated p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${type.color} border flex items-center justify-center`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-700">
                    {type.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {t(`${type.key}.title`)}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {t(`${type.key}.description`)}
                </p>
                <div className="flex items-center text-sm text-primary-600 font-medium group-hover:gap-2 transition-all">
                  <span>Batafsil</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
