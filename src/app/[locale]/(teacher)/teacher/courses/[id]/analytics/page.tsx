'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, Loader2, Users, Target, AlertTriangle, Play, FileText, ListChecks,
} from 'lucide-react';

interface LessonStat {
  lessonId: string;
  titleUz: string;
  sectionTitleUz: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';
  order: number;
  completedCount: number;
  completionRate: number | null;
}

interface DropOff {
  lessonId: string;
  titleUz: string;
  order: number;
  drop: number;
}

const LESSON_ICONS = { VIDEO: Play, TEXT: FileText, QUIZ: ListChecks, PDF: FileText };

export default function CourseAnalyticsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [avgCourseCompletionPct, setAvgCourseCompletionPct] = useState(0);
  const [dropOff, setDropOff] = useState<DropOff | null>(null);
  const [lessons, setLessons] = useState<LessonStat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teacher/courses/${courseId}/analytics`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Xatolik yuz berdi');
          return;
        }
        setTotalEnrollments(data.totalEnrollments);
        setAvgCourseCompletionPct(data.avgCourseCompletionPct);
        setDropOff(data.dropOff);
        setLessons(data.lessons || []);
      })
      .catch(() => setError('Server xatolik'))
      .finally(() => setLoading(false));
  }, [courseId]);

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
        <Link href="/teacher/courses" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kurs tahlili</h1>
          <p className="text-sm text-text-secondary">Talabalar qaysi darsda faolroq va qayerda to&apos;xtab qolayotganini ko&apos;ring</p>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Users size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary">Jami yozilganlar</p>
            <p className="text-xl font-bold text-text-primary">{totalEnrollments}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Target size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary">Kursni to&apos;liq tugatganlar</p>
            <p className="text-xl font-bold text-text-primary">{avgCourseCompletionPct}%</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Asosiy chiqib ketish nuqtasi</p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {dropOff ? `#${dropOff.order + 1} — ${dropOff.titleUz}` : "Ma'lumot yetarli emas"}
            </p>
          </div>
        </div>
      </div>

      {totalEnrollments === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-secondary text-sm">
            Hali hech kim bu kursga yozilmagan. Talabalar yozilib, darslarni o&apos;tay boshlagach, shu yerda dars darajasidagi tahlil paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-text-primary mb-4">Darslar bo&apos;yicha (tartib bo&apos;yicha)</h2>
          <div className="space-y-2">
            {lessons.map((l) => {
              const Icon = LESSON_ICONS[l.type];
              const isDropOff = dropOff?.lessonId === l.lessonId;
              return (
                <div
                  key={l.lessonId}
                  className={`p-3 rounded-xl border ${isDropOff ? 'border-red-200 bg-red-50/40' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">#{l.order + 1}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{l.sectionTitleUz}</span>
                        {isDropOff && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Chiqib ketish nuqtasi</span>
                        )}
                      </div>
                      <div className="text-sm text-text-primary flex items-center gap-1.5">
                        <Icon size={13} className="text-text-secondary flex-shrink-0" />
                        {l.titleUz}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      {l.completionRate === null ? (
                        <span className="text-xs text-text-secondary">Ma&apos;lumot yo&apos;q</span>
                      ) : (
                        <span className={`text-sm font-bold ${
                          l.completionRate >= 70 ? 'text-green-600' : l.completionRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {l.completionRate}% tugatgan
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary justify-end">
                        <span className="flex items-center gap-1"><Users size={10} /> {l.completedCount}</span>
                      </div>
                    </div>
                  </div>
                  {l.completionRate !== null && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${l.completionRate >= 70 ? 'bg-green-500' : l.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${l.completionRate}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
