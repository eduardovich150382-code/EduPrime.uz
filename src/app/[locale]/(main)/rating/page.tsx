'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users } from 'lucide-react';

export default function RatingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium mb-4">
          <Trophy size={16} />
          O&apos;zbekiston bo&apos;ylab reyting
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Reyting jadvali</h1>
        <p className="text-text-secondary mt-1">Eng ko&apos;p ball to&apos;plagan foydalanuvchilar</p>
      </motion.div>

      {/* Empty state */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated p-12 text-center"
      >
        <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Reyting hali shakllanmagan
        </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          Foydalanuvchilar test yechishni boshlagandan keyin reyting jadvali avtomatik shakllanadi. 
          Birinchi bo&apos;ling — test yeching va reytingda #1 o&apos;rinni egallang!
        </p>
        <a href="/tests" className="btn-primary inline-flex items-center gap-2">
          <TrendingUp size={16} />
          Test yechishni boshlash
        </a>
      </motion.div>
    </div>
  );
}
