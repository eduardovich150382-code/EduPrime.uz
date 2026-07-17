'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import {
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
  BookOpen, Search, Clock, Lock, Loader2, Building2,
  ArrowLeft, ChevronRight, TrendingUp, Sparkles, CheckCircle,
  SortAsc, Filter,
} from 'lucide-react';

// ===================== TYPES =====================

interface SubjectItem {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

interface TestItem {
  id: string;
  titleUz: string;
  isFree: boolean;
  duration: number;
  questionCount: number;
  difficulty: number;
  coverImage: string | null;
  subject: { nameUz: string; icon: string | null };
  createdAt?: string;
  _userResult?: { percentage: number } | null;
}

type ViewMode = 'categories' | 'subjects' | 'tests';
type SortMode = 'newest' | 'easiest' | 'hardest' | 'popular';

// ===================== CATEGORIES =====================

const categories = [
  { id: 'dtm', label: 'DTM', icon: GraduationCap, type: 'DTM', hasSubjects: true },
  { id: 'school', label: 'Maktab', icon: School, type: 'SCHOOL', hasSubjects: true },
  { id: 'attestation', label: 'Attestatsiya', icon: Award, type: 'ATTESTATION', hasSubjects: true },
  { id: 'president_school', label: 'Prezident maktabi', icon: Building2, type: 'PRESIDENT_SCHOOL', hasSubjects: false },
  { id: 'sat', label: 'SAT', icon: Globe2, type: 'SAT', hasSubjects: true },
  { id: 'gre', label: 'GRE', icon: Atom, type: 'GRE', hasSubjects: false },
  { id: 'certificate', label: 'Milliy sertifikat', icon: FileCheck, type: 'CERTIFICATE', hasSubjects: true },
];

const typeToCategory: Record<string, string> = {
  DTM: 'dtm',
  SCHOOL: 'school',
  ATTESTATION: 'attestation',
  SAT: 'sat',
  GRE: 'gre',
  CERTIFICATE: 'certificate',
  PRESIDENT_SCHOOL: 'president_school',
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

const subjectAccentColors = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-purple-500',
  'border-l-orange-500',
  'border-l-pink-500',
  'border-l-teal-500',
  'border-l-indigo-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
];

// SAT hardcoded subjects (fallback when no subjects exist in DB)
const satHardcodedSubjects: SubjectItem[] = [
  {
    id: 'sat-math',
    nameUz: 'SAT Math',
    nameRu: 'SAT Math',
    nameEn: 'SAT Math',
    icon: null,
    category: { nameUz: 'SAT', type: 'SAT' },
  },
  {
    id: 'sat-reading',
    nameUz: 'SAT Reading & Writing',
    nameRu: 'SAT Reading & Writing',
    nameEn: 'SAT Reading & Writing',
    icon: null,
    category: { nameUz: 'SAT', type: 'SAT' },
  },
];

// ===================== COMPONENTS =====================

function DifficultyBars({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-0.5" title={`Qiyinlik: ${level}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`rounded-sm ${
            i < level ? 'bg-primary-600' : 'bg-gray-200'
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

function WelcomeGreeting({ name }: { name: string | null | undefined }) {
  if (!name) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-2"
    >
      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
        Xush kelibsiz, {name}!
      </h2>
    </motion.div>
  );
}

function SubjectCard({
  subject,
  index,
  onClick,
}: {
  subject: SubjectItem;
  index: number;
  onClick: () => void;
}) {
  const accentColor = subjectAccentColors[index % subjectAccentColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl border border-gray-100 border-l-4 ${accentColor} p-5 shadow-sm hover:shadow-lg transition-all duration-200 group`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
          {subject.icon ? (
            <span className="text-lg">{subject.icon}</span>
          ) : (
            <BookOpen size={20} className="text-primary-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary group-hover:text-primary-600 transition-colors truncate">
            {subject.nameUz}
          </h3>
        </div>
        <ChevronRight size={18} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
      </div>
    </motion.div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors mb-4"
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </motion.button>
  );
}

function TestCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-32 w-full bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-4 mt-4">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function SubjectCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function isNewTest(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

// ===================== MAIN CONTENT =====================

function TestsPageContent() {
  const searchParams = useSearchParams();
  const session = useSession();
  const userName = session?.data?.user?.name;

  const [activeCategory, setActiveCategory] = useState('dtm');
  const [viewMode, setViewMode] = useState<ViewMode>('subjects');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [recentResults, setRecentResults] = useState<{testId: string; percentage: number}[]>([]);

  // Fetch recent results for "solved" badges
  useEffect(() => {
    fetch('/api/results?limit=100&brief=true')
      .then(r => r.json())
      .then(data => {
        if (data.results) {
          setRecentResults(data.results.map((r: any) => ({ testId: r.testId, percentage: r.percentage })));
        }
      })
      .catch(() => {});
  }, []);

  // Read type from URL search params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && typeToCategory[typeParam]) {
      const catId = typeToCategory[typeParam];
      setActiveCategory(catId);
      const cat = categories.find(c => c.id === catId);
      if (cat && cat.hasSubjects) {
        setViewMode('subjects');
      } else {
        setViewMode('tests');
      }
    }
  }, [searchParams]);

  // Fetch subjects for categories that have them
  const fetchSubjects = useCallback(async (type: string) => {
    setLoadingSubjects(true);
    try {
      const res = await fetch(`/api/subjects?type=${type}`);
      const data = await res.json();
      if (data.subjects) {
        // For SAT, if no subjects in DB, use hardcoded ones
        if (type === 'SAT' && data.subjects.length === 0) {
          setSubjects(satHardcodedSubjects);
        } else {
          setSubjects(data.subjects);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      if (type === 'SAT') {
        setSubjects(satHardcodedSubjects);
      }
    }
    setLoadingSubjects(false);
  }, []);

  // Fetch tests by type (for GRE, PRESIDENT_SCHOOL)
  const fetchTestsByType = useCallback(async (type: string) => {
    setLoadingTests(true);
    try {
      const res = await fetch(`/api/tests?type=${type}`);
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
    setLoadingTests(false);
  }, []);

  // Fetch tests by subject
  const fetchTestsBySubject = useCallback(async (subjectId: string) => {
    setLoadingTests(true);
    try {
      const res = await fetch(`/api/tests?subject=${subjectId}`);
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
    setLoadingTests(false);
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((catId: string) => {
    setActiveCategory(catId);
    setSelectedSubject(null);
    setTests([]);
    setSubjects([]);

    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    if (cat.hasSubjects) {
      setViewMode('subjects');
      fetchSubjects(cat.type);
    } else {
      setViewMode('tests');
      fetchTestsByType(cat.type);
    }
  }, [fetchSubjects, fetchTestsByType]);

  // Handle subject click
  const handleSubjectClick = useCallback((subject: SubjectItem) => {
    setSelectedSubject(subject);
    setViewMode('tests');
    // For hardcoded SAT subjects (fake IDs like 'sat-math', 'sat-reading'),
    // fetch all SAT tests by type instead of by non-existent subject ID
    if (subject.id.startsWith('sat-')) {
      fetchTestsByType('SAT');
    } else {
      fetchTestsBySubject(subject.id);
    }
  }, [fetchTestsBySubject, fetchTestsByType]);

  // Handle back navigation
  const handleBackToSubjects = useCallback(() => {
    setSelectedSubject(null);
    setViewMode('subjects');
    setTests([]);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedSubject(null);
    setViewMode('subjects');
    setTests([]);
    setSubjects([]);
    const cat = categories.find(c => c.id === activeCategory);
    if (cat && cat.hasSubjects) {
      fetchSubjects(cat.type);
    }
  }, [activeCategory, fetchSubjects]);

  // Initialize on mount - load first category's subjects
  useEffect(() => {
    const cat = categories.find(c => c.id === activeCategory);
    if (cat && cat.hasSubjects) {
      fetchSubjects(cat.type);
    } else if (cat && !cat.hasSubjects) {
      setViewMode('tests');
      fetchTestsByType(cat.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logic for search
  const filteredSubjects = subjects.filter((s) =>
    s.nameUz.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.titleUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject.nameUz.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Sort tests
  const sortedTests = [...filteredTests].sort((a, b) => {
    switch (sortMode) {
      case 'easiest': return a.difficulty - b.difficulty;
      case 'hardest': return b.difficulty - a.difficulty;
      case 'popular': return b.questionCount - a.questionCount;
      case 'newest':
      default: return 0; // Keep server order (newest first)
    }
  });

  // Helper: get user's best result for a test
  const getUserResult = (testId: string) => {
    return recentResults.find(r => r.testId === testId);
  };

  const currentCategory = categories.find(c => c.id === activeCategory);

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WelcomeGreeting name={userName} />
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Testlar</h1>
          <p className="text-text-secondary mt-1">
            Barcha turdagi testlarni tanlang va yechishni boshlang
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-2 py-1.5 md:px-4 md:py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white border border-border text-text-secondary hover:border-primary-200 hover:text-primary-600'
              }`}
            >
              <cat.icon size={14} className="md:w-4 md:h-4 shrink-0" />
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          {/* SUBJECTS VIEW */}
          {viewMode === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loadingSubjects ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <SubjectCardSkeleton key={i} />)}
                </div>
              ) : filteredSubjects.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredSubjects.map((subject, index) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      index={index}
                      onClick={() => handleSubjectClick(subject)}
                    />
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={36} className="text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">
                    Fanlar hali qo&apos;shilmagan
                  </h2>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Bu kategoriya uchun fanlar tez orada qo&apos;shiladi.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* TESTS VIEW */}
          {viewMode === 'tests' && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Back button */}
              {currentCategory?.hasSubjects && (
                <BackButton
                  onClick={selectedSubject ? handleBackToSubjects : handleBackToCategories}
                  label={selectedSubject ? `${selectedSubject.nameUz} - Orqaga` : 'Fanlarga qaytish'}
                />
              )}

              {loadingTests ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <TestCardSkeleton key={i} />)}
                </div>
              ) : sortedTests.length > 0 ? (
                <>
                  {/* Sort bar */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <SortAsc size={14} className="text-text-secondary" />
                    {([
                      { key: 'newest' as SortMode, label: 'Yangi' },
                      { key: 'easiest' as SortMode, label: 'Oson' },
                      { key: 'hardest' as SortMode, label: 'Qiyin' },
                      { key: 'popular' as SortMode, label: 'Mashhur' },
                    ]).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSortMode(s.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          sortMode === s.key
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <span className="text-xs text-text-secondary ml-auto">{sortedTests.length} ta test</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {sortedTests.map((test, index) => {
                    const userResult = getUserResult(test.id);
                    return (
                    <Link key={test.id} href={`/tests/${test.id}/solve`}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <div className="card hover:border-primary-200 group cursor-pointer h-full overflow-hidden">
                          {/* Cover image or gradient */}
                          <div
                            className={`h-32 w-full relative ${
                              !test.coverImage
                                ? `bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`
                                : ''
                            }`}
                          >
                            {test.coverImage ? (
                              <Image
                                src={test.coverImage}
                                alt={test.titleUz}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen size={36} className="text-white/50" />
                              </div>
                            )}
                            {/* Badge overlays */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span
                                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                  test.isFree
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-white/90 text-primary-700'
                                }`}
                              >
                                {test.isFree ? 'Bepul' : 'Premium'}
                              </span>
                              {isNewTest(test.createdAt) && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-0.5">
                                  <Sparkles size={10} /> Yangi
                                </span>
                              )}
                            </div>
                            {/* User result badge */}
                            {userResult && (
                              <span className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 shadow-sm flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-600" />
                                <span className={userResult.percentage >= 70 ? 'text-green-700' : 'text-yellow-700'}>{userResult.percentage}%</span>
                              </span>
                            )}
                            {!test.isFree && !userResult && (
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
                      </motion.div>
                    </Link>
                  );
                  })}
                </div>
                </>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={36} className="text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">
                    Testlar hali qo&apos;shilmagan
                  </h2>
                  <p className="text-text-secondary max-w-md mx-auto mb-6">
                    Tez orada testlar qo&apos;shiladi. Yangi testlar haqida bildirishnoma olish uchun
                    Telegram kanalimizga qo&apos;shiling.
                  </p>
                  <a
                    href="https://t.me/EduPrimeuz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Kanalga qo&apos;shilish
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
