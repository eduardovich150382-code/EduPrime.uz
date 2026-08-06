'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  ArrowLeft, Loader2, Users, Target, AlertTriangle, Clock, SkipForward,
} from 'lucide-react';

interface QuestionStat {
  questionId: string;
  text: string;
  order: number;
  topic: string | null;
  bloomLevel: string | null;
  type: string;
  attempts: number;
  skipped: number;
  correctRate: number | null;
  avgTimeSpent: number;
}

export default function TestAnalyticsPage() {
  const params = useParams();
  const testId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [avgPercentage, setAvgPercentage] = useState(0);
  const [questions, setQuestions] = useState<QuestionStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortHardestFirst, setSortHardestFirst] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/tests/${testId}/analytics`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Xatolik yuz berdi');
          return;
        }
        setTotalAttempts(data.totalAttempts);
        setAvgPercentage(data.avgPercentage);
        setQuestions(data.questions || []);
      })
      .catch(() => setError('Server xatolik'))
      .finally(() => setLoading(false));
  }, [testId]);

  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.correctRate === null && b.correctRate === null) return a.order - b.order;
    if (a.correctRate === null) return 1;
    if (b.correctRate === null) return -1;
    return sortHardestFirst ? a.correctRate - b.correctRate : b.correctRate - a.correctRate;
  });

  const hardestQuestion = [...questions]
    .filter((q) => q.correctRate !== null && q.attempts >= 3)
    .sort((a, b) => (a.correctRate ?? 100) - (b.correctRate ?? 100))[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <Link href="/teacher/tests" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Savol darajasidagi tahlil</h1>
          <p className="text-sm text-text-secondary">Har bir savol qanchalik yaxshi ishlayotganini ko&apos;ring</p>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Users size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary">Jami urinishlar</p>
            <p className="text-xl font-bold text-text-primary">{totalAttempts}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Target size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary">O&apos;rtacha natija</p>
            <p className="text-xl font-bold text-text-primary">{avgPercentage}%</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Eng qiyin savol</p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {hardestQuestion ? `#${hardestQuestion.order + 1} — ${hardestQuestion.correctRate}% to'g'ri` : "Ma'lumot yetarli emas"}
            </p>
          </div>
        </div>
      </div>

      {totalAttempts === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-secondary text-sm">
            Hali hech kim bu testni yechmagan. Talabalar javob bergandan keyin shu yerda savol darajasidagi tahlil paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Savollar bo&apos;yicha</h2>
            <button
              onClick={() => setSortHardestFirst((v) => !v)}
              className="text-xs text-primary-600 hover:underline"
            >
              {sortHardestFirst ? "Eng qiyinlari yuqorida" : "Savol tartibida"}
            </button>
          </div>
          <div className="space-y-2">
            {sortedQuestions.map((q) => (
              <div key={q.questionId} className="p-3 rounded-xl border border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">#{q.order + 1}</span>
                      {q.topic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{q.topic}</span>}
                      {q.bloomLevel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{q.bloomLevel}</span>}
                    </div>
                    <div className="text-sm text-text-primary line-clamp-2">
                      <LatexRenderer content={q.text} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    {q.correctRate === null ? (
                      <span className="text-xs text-text-secondary">Javob yo&apos;q</span>
                    ) : (
                      <span className={`text-sm font-bold ${
                        q.correctRate >= 70 ? 'text-green-600' : q.correctRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {q.correctRate}% to&apos;g&apos;ri
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary justify-end">
                      <span className="flex items-center gap-1"><Users size={10} /> {q.attempts}</span>
                      {q.avgTimeSpent > 0 && <span className="flex items-center gap-1"><Clock size={10} /> {q.avgTimeSpent}s</span>}
                      {q.skipped > 0 && <span className="flex items-center gap-1"><SkipForward size={10} /> {q.skipped}</span>}
                    </div>
                  </div>
                </div>
                {/* Correct-rate bar */}
                {q.correctRate !== null && (
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${q.correctRate >= 70 ? 'bg-green-500' : q.correctRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${q.correctRate}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
