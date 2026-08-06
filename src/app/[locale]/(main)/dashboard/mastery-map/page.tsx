'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import PremiumCTA from '@/components/ui/PremiumCTA';
import {
  Compass, TrendingUp, TrendingDown, Minus, Loader2, BookOpen,
  Sparkles, Info, ArrowRight, CalendarDays, CalendarRange, CalendarClock,
} from 'lucide-react';

interface TopicStat {
  topic: string;
  subjectId: string;
  subjectName: string;
  subjectIcon: string | null;
  attempts: number;
  correct: number;
  rate: number;
}

interface Recommendation {
  topic: string;
  subjectName: string;
  testId: string;
  testTitle: string;
  questionCount: number;
  kind: 'GENERATED' | 'EXISTING';
}

interface ScheduleEntry {
  label: string;
  focusTopics: string[];
  description: string;
}

interface MasteryMapData {
  hasData: boolean;
  isFreeTierView: boolean;
  strong?: TopicStat[];
  medium?: TopicStat[];
  weak?: TopicStat[];
  insufficient?: TopicStat[];
  recommendations?: Recommendation[];
  schedule?: { week: ScheduleEntry[]; month: ScheduleEntry[]; sixMonths: ScheduleEntry[] };
  tips?: Record<string, string>;
}

const RANGE_TABS = [
  { key: 'week' as const, label: '1 hafta', icon: CalendarDays },
  { key: 'month' as const, label: '1 oy', icon: CalendarRange },
  { key: 'sixMonths' as const, label: '6 oy', icon: CalendarClock },
];

function TopicRow({ t }: { t: TopicStat }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-background">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">{t.subjectIcon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{t.topic}</p>
          <p className="text-xs text-text-secondary">{t.subjectName} · {t.attempts} ta urinish</p>
        </div>
      </div>
      <span className="text-sm font-bold flex-shrink-0 ml-3" style={{ color: t.rate >= 75 ? '#16a34a' : t.rate >= 50 ? '#ca8a04' : '#dc2626' }}>
        {t.rate}%
      </span>
    </div>
  );
}

export default function MasteryMapPage() {
  const [data, setData] = useState<MasteryMapData | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'week' | 'month' | 'sixMonths'>('week');

  useEffect(() => {
    fetch('/api/student/mastery-map')
      .then(async (res) => {
        if (res.status === 403) {
          setLimitReached(true);
          return;
        }
        const json = await res.json();
        setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Bilim xaritangiz tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        <div className="text-center py-6">
          <Compass size={40} className="text-primary-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Bepul ko&apos;rish limiti tugadi</h1>
          <p className="text-text-secondary text-sm mb-6">
            Bilim xaritasidan bepul tarifda faqat 1 marta foydalanish mumkin edi. Cheksiz foydalanish, yangilangan tashxis
            va shaxsiy o&apos;sish rejasi uchun Premium yoki Ustoz tarifiga o&apos;ting.
          </p>
        </div>
        <PremiumCTA variant="full" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        <div className="text-center py-16">
          <Compass size={40} className="text-text-secondary mx-auto mb-4 opacity-50" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Bilim xaritangiz hali bo&apos;sh</h1>
          <p className="text-text-secondary text-sm mb-6">
            Kamida bitta test yeching — kuchli va zaif tomonlaringiz, shaxsiy o&apos;sish rejangiz shu yerda paydo bo&apos;ladi.
          </p>
          <Link href="/tests" className="btn-primary inline-flex items-center gap-2">
            Test yechishni boshlash <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const { strong = [], medium = [], weak = [], insufficient = [], recommendations = [], schedule, tips = {} } = data;
  const activeEntries = schedule ? schedule[range] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Compass size={24} className="text-primary-600" /> Bilim xaritasi
        </h1>
        <p className="text-text-secondary text-sm mt-1">Kuchli va zaif tomonlaringiz, shaxsiy tavsiyalar va o&apos;sish rejasi</p>
      </motion.div>

      {data.isFreeTierView && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2 text-sm text-blue-700">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>Bu sizning bepul tarifdagi 1 martalik ko&apos;rishingiz edi. Keyingi safar yangilangan xarita uchun Premium yoki Ustoz tarifi kerak bo&apos;ladi.</span>
        </div>
      )}

      {/* Diagnosis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-green-600" />
            <h2 className="font-semibold text-text-primary text-sm">Kuchli tomonlar</h2>
          </div>
          {strong.length === 0 ? (
            <p className="text-xs text-text-secondary">Hali aniqlanmagan</p>
          ) : (
            <div className="space-y-2">{strong.slice(0, 6).map((t, i) => <TopicRow key={i} t={t} />)}</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Minus size={18} className="text-yellow-600" />
            <h2 className="font-semibold text-text-primary text-sm">O&apos;rtacha</h2>
          </div>
          {medium.length === 0 ? (
            <p className="text-xs text-text-secondary">Hali aniqlanmagan</p>
          ) : (
            <div className="space-y-2">{medium.slice(0, 6).map((t, i) => <TopicRow key={i} t={t} />)}</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-red-600" />
            <h2 className="font-semibold text-text-primary text-sm">Zaif tomonlar</h2>
          </div>
          {weak.length === 0 ? (
            <p className="text-xs text-text-secondary">Zaif mavzu topilmadi — ajoyib!</p>
          ) : (
            <div className="space-y-2">{weak.slice(0, 6).map((t, i) => <TopicRow key={i} t={t} />)}</div>
          )}
        </motion.div>
      </div>

      {insufficient.length > 0 && (
        <p className="text-xs text-text-secondary px-1">
          {insufficient.length} ta mavzu bo&apos;yicha hali yetarli ma&apos;lumot yo&apos;q (kamida 3 marta urinish kerak) — aniq baholanmadi.
        </p>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600" /> Siz uchun tavsiya etilgan testlar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((r, i) => (
              <Link
                key={i}
                href={`/tests/${r.testId}/solve`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary-200 hover:bg-primary-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{r.testTitle}</p>
                  <p className="text-xs text-text-secondary">{r.subjectName} · {r.questionCount} savol</p>
                </div>
                <ArrowRight size={16} className="text-text-secondary flex-shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Growth plan */}
      {schedule && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-6">
          <h2 className="font-semibold text-text-primary mb-4">Shaxsiy o&apos;sish rejasi</h2>
          <div className="flex gap-2 mb-5">
            {RANGE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRange(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  range === tab.key ? 'bg-primary-600 text-white' : 'bg-background text-text-secondary hover:bg-primary-50'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {activeEntries.map((entry, i) => (
              <div key={i} className="p-4 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{entry.label}</span>
                  {entry.focusTopics.map((topic, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{topic}</span>
                  ))}
                </div>
                <p className="text-sm text-text-primary">{entry.description}</p>
                {entry.focusTopics.filter((t) => tips[t]).length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {entry.focusTopics.filter((t) => tips[t]).map((topic, j) => (
                      <p key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                        <Sparkles size={12} className="text-primary-400 flex-shrink-0 mt-0.5" />
                        <span><strong className="text-text-primary">{topic}:</strong> {tips[topic]}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
