'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
  BookOpen, Search, Clock, Star, Lock, Loader2,
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

interface TestItem {
  id: string;
  titleUz: string;
  isFree: boolean;
  duration: number;
  questionCount: number;
  difficulty: number;
  subject: { nameUz: string; icon: string | null };
}

export default function TestsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tests');
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.titleUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject.nameUz.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Testlar</h1>
        <p className="text-text-secondary mt-1">Barcha turdagi testlarni tanlang va yechishni boshlang</p>
      </motion.div>

      {/* Search */}
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

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
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
      </div>

      {/* Tests */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Testlar yuklanmoqda...</p>
        </div>
      ) : filteredTests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => (
            <Link key={test.id} href={`/tests/${test.id}/solve`}>
              <div className="card p-5 hover:border-primary-200 group cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    test.isFree ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {test.isFree ? 'Bepul' : 'Premium'}
                  </span>
                  {!test.isFree && <Lock size={14} className="text-text-secondary" />}
                </div>
                <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors">
                  {test.titleUz}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {test.subject.icon} {test.subject.nameUz}
                </p>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} /> {test.questionCount} savol
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {test.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < test.difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    ))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-elevated p-12 text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen size={36} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Testlar hali qo&apos;shilmagan
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Tez orada testlar qo&apos;shiladi. Yangi testlar haqida bildirishnoma olish uchun
            Telegram botimizga a&apos;zo bo&apos;ling: @EduPrimeuzbot
          </p>
        </div>
      )}
    </div>
  );
}
