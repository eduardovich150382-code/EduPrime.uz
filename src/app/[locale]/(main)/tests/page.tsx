'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { BookOpen, Loader2, Zap } from 'lucide-react';
import { TestCard, TestCardSkeleton, type TestItem } from '@/components/tests/TestCard';
import { TestsSearchBar } from '@/components/tests/TestsSearchBar';
import { TestsFilters, type SubjectOption } from '@/components/tests/TestsFilters';
import {
  buildQuery,
  buildTestsApiQuery,
  parseFilters,
  type TestGoal,
  type TestsFilters as Filters,
  type TestsSort,
} from '@/lib/tests-filters';

// 24 — 2 va 3 ustunli to'rda ham to'liq qatorlar bilan tugaydi.
const PAGE_SIZE = 24;

interface TestsResponse {
  tests?: TestItem[];
  total?: number;
}

function TestsPageContent() {
  const t = useTranslations('tests');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filtrning yagona manbai — URL. Holatni alohida useState'da saqlasak,
  // orqaga tugmasi yoki ulashilgan havola bilan ochilganda ular ajralib
  // qolardi.
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recentResults, setRecentResults] = useState<{ testId: string; percentage: number }[]>([]);

  // Har filtr o'zgarishi push emas, replace: aks holda har chip bosilishi
  // tarixga yoziladi va "orqaga" sahifadan chiqish o'rniga chiplarni birma-bir
  // qaytaradi.
  const applyFilters = useCallback(
    (next: Filters) => {
      router.replace(`${pathname}${buildQuery(next)}`, { scroll: false });
    },
    [router, pathname],
  );

  const handleTypeChange = (type: TestGoal | null) => applyFilters({ ...filters, type, subject: null });
  const handleSubjectChange = (subject: string | null) => applyFilters({ ...filters, subject });
  const handleSortChange = (sort: TestsSort) => applyFilters({ ...filters, sort });
  const handleQueryChange = useCallback(
    (q: string) => applyFilters({ ...filters, q }),
    [applyFilters, filters],
  );
  const clearFilters = () => router.replace(pathname, { scroll: false });

  // Fetch recent results for "solved" badges
  useEffect(() => {
    fetch('/api/results?limit=100&brief=true')
      .then(r => r.json())
      .then((data: { results?: { testId: string; percentage: number }[] }) => {
        if (data.results) {
          setRecentResults(data.results.map((r) => ({ testId: r.testId, percentage: r.percentage })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.type) {
      setSubjects([]);
      return;
    }
    const controller = new AbortController();
    setLoadingSubjects(true);
    fetch(`/api/subjects?type=${filters.type}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { subjects?: SubjectOption[] }) => {
        setSubjects(data.subjects ?? []);
        setLoadingSubjects(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch subjects:', error);
        setSubjects([]);
        setLoadingSubjects(false);
      });
    return () => controller.abort();
  }, [filters.type]);

  // Sahifalashsiz so'rov kaliti — filtr o'zgarganini shu satr bilan
  // aniqlaymiz (filters obyekti har searchParams'da yangi bo'ladi).
  const filtersKey = buildTestsApiQuery(filters, 1, PAGE_SIZE);
  const filtersKeyRef = useRef(filtersKey);
  filtersKeyRef.current = filtersKey;

  useEffect(() => {
    // Tez-tez chip bosilganda eski javob yangisining ustiga yozilmasin.
    const controller = new AbortController();
    setLoadingTests(true);
    fetch(`/api/tests?${filtersKey}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: TestsResponse) => {
        setTests(data.tests ?? []);
        setTotal(data.total ?? 0);
        setPage(1);
        setLoadingTests(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch tests:', error);
        setTests([]);
        setTotal(0);
        setLoadingTests(false);
      });
    return () => controller.abort();
  }, [filtersKey]);

  const loadMore = async () => {
    const requestKey = filtersKey;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/tests?${buildTestsApiQuery(filters, nextPage, PAGE_SIZE)}`);
      const data: TestsResponse = await res.json();
      // Yuklash davomida filtr almashgan bo'lsa, eski filtrning testlarini
      // yangi ro'yxatga qo'shib yubormaslik kerak.
      if (filtersKeyRef.current !== requestKey) return;
      setTests((prev) => [...prev, ...(data.tests ?? [])]);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const resultByTestId = useMemo(
    () => new Map(recentResults.map((r) => [r.testId, r])),
    [recentResults],
  );

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h1>
            <p className="text-text-secondary mt-1">{t('subtitle')}</p>
          </div>
          <Link
            href="/build"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100"
          >
            <Zap size={16} />
            {t('quickTest')}
          </Link>
        </div>

        <TestsSearchBar value={filters.q} onChange={handleQueryChange} />

        <TestsFilters
          filters={filters}
          subjects={subjects}
          loadingSubjects={loadingSubjects}
          onTypeChange={handleTypeChange}
          onSubjectChange={handleSubjectChange}
          onSortChange={handleSortChange}
        />

        {loadingTests ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <TestCardSkeleton key={i} />)}
          </div>
        ) : tests.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{t('count', { count: total })}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tests.map((test, index) => (
                <TestCard
                  key={test.id}
                  test={test}
                  // Animatsiya kechikishi har "ko'proq" sahifasida noldan
                  // boshlansin — aks holda 48-karta 2.4 s kutib chiqadi.
                  index={index % PAGE_SIZE}
                  userResult={resultByTestId.get(test.id)}
                />
              ))}
            </div>
            {tests.length < total && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-5 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  {t('loadMore')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <BookOpen size={28} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">{t('empty.title')}</h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">{t('empty.body')}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t('empty.clear')}
            </button>
          </div>
        )}
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
