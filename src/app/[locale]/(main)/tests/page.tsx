'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
  BookOpen, Search,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'Barchasi', icon: BookOpen },
  { id: 'dtm', label: 'DTM', icon: GraduationCap },
  { id: 'school', label: 'Maktab', icon: School },
  { id: 'attestation', label: 'Attestatsiya', icon: Award },
  { id: 'sat', label: 'SAT', icon: Globe2 },
  { id: 'gre', label: 'GRE', icon: Atom },
  { id: 'certificate', label: 'Sertifikat', icon: FileCheck },
];

export default function TestsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Testlar</h1>
        <p className="text-text-secondary mt-1">Barcha turdagi testlarni tanlang va yechishni boshlang</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Test qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
        </div>
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200 hover:text-primary-600'
            }`}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Empty state */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card-elevated p-12 text-center"
      >
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen size={36} className="text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Testlar hali qo&apos;shilmagan
        </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          Tez orada testlar qo&apos;shiladi. Yangi testlar haqida bildirishnoma olish uchun 
          Telegram botimizga a&apos;zo bo&apos;ling: @EduPrimeuzbot
        </p>
      </motion.div>
    </div>
  );
}
