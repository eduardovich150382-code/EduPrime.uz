'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import {
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
  Lock, Clock, BookOpen, Star, Search, Filter,
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

// Mock test data
const mockTests = [
  { id: '1', title: 'DTM Matematika #1', category: 'dtm', subject: 'Matematika', questions: 30, duration: 210, difficulty: 3, isFree: true, hasVideo: true },
  { id: '2', title: 'DTM Fizika #1', category: 'dtm', subject: 'Fizika', questions: 30, duration: 210, difficulty: 4, isFree: false, hasVideo: true },
  { id: '3', title: 'Maktab 11-sinf Matematika', category: 'school', subject: 'Matematika', questions: 25, duration: 60, difficulty: 2, isFree: true, hasVideo: false },
  { id: '4', title: 'Attestatsiya Informatika', category: 'attestation', subject: 'Informatika', questions: 50, duration: 90, difficulty: 3, isFree: false, hasVideo: true },
  { id: '5', title: 'SAT Math Practice #1', category: 'sat', subject: 'Mathematics', questions: 44, duration: 80, difficulty: 4, isFree: false, hasVideo: true },
  { id: '6', title: 'GRE Physics Full Test', category: 'gre', subject: 'Physics', questions: 70, duration: 170, difficulty: 5, isFree: false, hasVideo: false },
  { id: '7', title: 'Milliy Sertifikat - Ingliz tili', category: 'certificate', subject: 'Ingliz tili', questions: 55, duration: 120, difficulty: 3, isFree: false, hasVideo: true },
  { id: '8', title: 'DTM Kimyo #2', category: 'dtm', subject: 'Kimyo', questions: 30, duration: 210, difficulty: 3, isFree: true, hasVideo: false },
];

export default function TestsPage() {
  const t = useTranslations('test');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTests = mockTests.filter((test) => {
    const matchesCategory = activeCategory === 'all' || test.category === activeCategory;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      {/* Search and filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
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

      {/* Tests grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link href={`/tests/${test.id}`}>
              <div className="card p-5 hover:border-primary-200 group cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    test.isFree
                      ? 'bg-green-100 text-green-700'
                      : 'bg-primary-100 text-primary-700'
                  }`}>
                    {test.isFree ? 'Bepul' : 'Premium'}
                  </span>
                  {!test.isFree && <Lock size={14} className="text-text-secondary" />}
                </div>

                <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors">
                  {test.title}
                </h3>

                <p className="text-sm text-text-secondary mb-4">{test.subject}</p>

                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} /> {test.questions} savol
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {test.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className={i < test.difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </span>
                </div>

                {test.hasVideo && (
                  <div className="mt-3 text-xs text-primary-600 font-medium">
                    📹 Video yechim mavjud
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {filteredTests.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-text-secondary mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary">Hech qanday test topilmadi</p>
        </div>
      )}
    </div>
  );
}
