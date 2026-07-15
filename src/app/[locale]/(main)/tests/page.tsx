'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
  BookOpen, Search, Clock, Lock, Loader2,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'Barchasi', icon: BookOpen, type: '' },
  { id: 'dtm', label: 'DTM', icon: GraduationCap, type: 'DTM' },
  { id: 'school', label: 'Maktab', icon: School, type: 'SCHOOL' },
  { id: 'attestation', label: 'Attestatsiya', icon: Award, type: 'ATTESTATION' },
  { id: 'sat', label: 'SAT', icon: Globe2, type: 'SAT' },
  { id: 'gre', label: 'GRE', icon: Atom, type: 'GRE' },
  { id: 'certificate', label: 'Sertifikat', icon: FileCheck, type: 'CERTIFICATE' },
];

const typeToCategory: Record<string, string> = {
  DTM: 'dtm',
  SCHOOL: 'school',
  ATTESTATION: 'attestation',
  SAT: 'sat',
  GRE: 'gre',
  CERTIFICATE: 'certificate',
};

const cardGradients = [
  'from-blue-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
];

interface TestItem {
  id: string;
  titleUz: string;
  isFree: boolean;
  duration: number;
  questionCount: number;
  difficulty: number;
  coverImage: string | null;
  subject: { nameUz: string; icon: string | null };
}

// Signal bars difficulty indicator component
function DifficultyBars({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-0.5" title={`Qiyinlik: ${level}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`rounded-sm ${
            i < level
              ? 'bg-primary-600'
              : 'bg-gray-200'
          }`}
          style={{
            width: '3px',
            height: `${6 + i * 3}px`,
          }}
        />
      ))}
    </span>
  );
}

function TestsPageContent() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Read type from URL search params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && typeToCategory[typeParam]) {
      setActiveCategory(typeToCategory[typeParam]);
    }
  }, [searchParams]);

  const fetchTests = useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) {
        params.set('type', type);
      }
      const url = `/api/tests${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const category = categories.find(c => c.id === activeCategory);
    fetchTests(category?.type || undefined);
  }, [activeCategory, fetchTests]);

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
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
          {filteredTests.map((test, index) => (
            <Link key={test.id} href={`/tests/${test.id}/solve`}>
              <div className="card hover:border-primary-200 group cursor-pointer h-full overflow-hidden">
                {/* Cover image or gradient */}
                <div className={`h-32 w-full relative ${
                  !test.coverImage ? `bg-gradient-to-br ${cardGradients[index % cardGradients.length]}` : ''
                }`}>
                  {test.coverImage ? (
                    <img
                      src={test.coverImage}
                      alt={test.titleUz}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={36} className="text-white/50" />
                    </div>
                  )}
                  {/* Badge overlay */}
                  <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${
                    test.isFree ? 'bg-green-100 text-green-700' : 'bg-white/90 text-primary-700'
                  }`}>
                    {test.isFree ? 'Bepul' : 'Premium'}
                  </span>
                  {!test.isFree && (
                    <span className="absolute top-3 right-3">
                      <Lock size={14} className="text-white/80" />
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
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
                    <span className="flex items-center gap-1.5">
                      <DifficultyBars level={test.difficulty} />
                      <span className="text-[10px]">Qiyinlik</span>
                    </span>
                  </div>
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

export default function TestsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto text-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
        </div>
      }
    >
      <TestsPageContent />
    </Suspense>
  );
}
