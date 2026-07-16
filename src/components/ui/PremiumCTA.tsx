'use client';

import { Link } from '@/i18n/routing';
import { Crown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumCTAProps {
  variant?: 'compact' | 'full' | 'header';
  className?: string;
}

export default function PremiumCTA({ variant = 'full', className = '' }: PremiumCTAProps) {
  if (variant === 'header') {
    return (
      <Link
        href="/pricing"
        className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-purple-700 transition-all duration-300 hover:scale-105 ${className}`}
      >
        {/* Animated gradient border */}
        <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-[2px] animate-gradient-border">
          <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-white group-hover:bg-purple-50 transition-colors" />
        </span>
        <span className="relative flex items-center gap-1.5">
          <Crown size={14} className="text-purple-600" />
          <span className="hidden sm:inline">Premium olish</span>
          <span className="sm:hidden">Premium</span>
        </span>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/pricing"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:scale-105 transition-all duration-300 ${className}`}
      >
        <Crown size={16} />
        Premium olish
      </Link>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 relative overflow-hidden ${className}`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100 to-transparent rounded-bl-full opacity-60" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-100 to-transparent rounded-tr-full opacity-60" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Crown size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Premium tarifga o&apos;ting</h3>
            <p className="text-xs text-text-secondary">Cheksiz imkoniyatlar</p>
          </div>
        </div>

        <ul className="space-y-2 mb-4 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            Barcha testlarga cheksiz kirish
          </li>
          <li className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            Batafsil yechimlar va video darslar
          </li>
          <li className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            AI yordamchi va shaxsiy tavsiyalar
          </li>
        </ul>

        <Link
          href="/pricing"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:scale-[1.02] transition-all duration-300"
        >
          <Crown size={18} />
          Premium olish
        </Link>
      </div>
    </motion.div>
  );
}
