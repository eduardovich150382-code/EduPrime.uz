'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import {
  Loader2, AlertCircle, Play, FileText, ListChecks, CheckCircle2,
  Circle, PartyPopper, ArrowRight, GraduationCap,
} from 'lucide-react';

interface LessonItem {
  id: string;
  titleUz: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';
  durationMinutes: number | null;
  videoUrl: string | null;
  content: string | null;
  test: { id: string; titleUz: string; questionCount: number; duration: number } | null;
  completed: boolean;
  lastPositionSeconds: number;
}

interface SectionItem {
  id: string;
  titleUz: string;
  lessons: LessonItem[];
}

interface LearnCourse {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  teacherName: string | null;
  sections: SectionItem[];
  totalLessons: number;
  completedLessons: number;
  isCompleted: boolean;
}

const LESSON_ICONS = { VIDEO: Play, TEXT: FileText, QUIZ: ListChecks, PDF: FileText };

export default function CourseLearnPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const lastSavedPositionRef = useRef<number>(-1);

  const allLessons = useMemo(() => course?.sections.flatMap((s) => s.lessons) || [], [course]);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = currentIndex >= 0 ? allLessons[currentIndex] : null;

  useEffect(() => {
    fetch(`/api/courses/${courseId}/learn`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Kursni yuklab bo\'lmadi');
          return;
        }
        setCourse(data.course);
        const lessons: LessonItem[] = data.course.sections.flatMap((s: SectionItem) => s.lessons);
        const firstIncomplete = lessons.find((l) => !l.completed);
        setCurrentLessonId((firstIncomplete || lessons[0])?.id || null);
      })
      .catch(() => setError("Server bilan bog'lanishda xatolik"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const updateLessonLocal = (lessonId: string, patch: Partial<LessonItem>) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
      }));
      const completedLessons = sections.flatMap((s) => s.lessons).filter((l) => l.completed).length;
      return { ...prev, sections, completedLessons };
    });
  };

  const saveProgress = async (lessonId: string, body: { completed?: boolean; lastPositionSeconds?: number }) => {
    try {
      await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Jim tarzda — vaqtinchalik tarmoq xatosi progress kuzatuvini to'xtatib qo'ymasligi kerak
    }
  };

  const handleMarkComplete = async (lessonId: string) => {
    setMarking(true);
    updateLessonLocal(lessonId, { completed: true });
    await saveProgress(lessonId, { completed: true });
    setMarking(false);

    // Avtomatik keyingi darsga o'tish
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    if (idx >= 0 && idx < allLessons.length - 1) {
      setCurrentLessonId(allLessons[idx + 1].id);
    }
  };

  const handleVideoProgress = (lessonId: string, seconds: number) => {
    const rounded = Math.floor(seconds);
    if (Math.abs(rounded - lastSavedPositionRef.current) < 3) return; // ortiqcha so'rov yubormaslik
    lastSavedPositionRef.current = rounded;
    saveProgress(lessonId, { lastPositionSeconds: rounded });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={36} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <AlertCircle size={40} className="text-red-400 mx-auto" />
        <p className="text-text-secondary">{error || 'Kurs topilmadi'}</p>
        <Link href={`/courses/${courseId}`} className="btn-primary inline-flex items-center gap-2">
          Kurs sahifasiga qaytish
        </Link>
      </div>
    );
  }

  const progressPct = course.totalLessons > 0 ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <BackButton />

      {/* Progress header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-semibold text-text-primary text-sm sm:text-base truncate flex items-center gap-2">
            <GraduationCap size={18} className="text-primary-600 flex-shrink-0" /> {course.titleUz}
          </h1>
          <span className="text-xs text-text-secondary flex-shrink-0">{course.completedLessons}/{course.totalLessons} dars</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-600" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
        </div>
        {course.isCompleted && (
          <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-2.5 text-sm">
            <PartyPopper size={16} /> Tabriklaymiz — siz bu kursni to&apos;liq tugatdingiz!
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main content */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          {currentLesson ? (
            <motion.div key={currentLesson.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-text-primary">{currentLesson.titleUz}</h2>

              {currentLesson.type === 'VIDEO' && currentLesson.videoUrl && (
                <SecureYouTubePlayer
                  videoUrl={currentLesson.videoUrl}
                  title={currentLesson.titleUz}
                  startPositionSeconds={currentLesson.lastPositionSeconds}
                  onProgress={(seconds) => handleVideoProgress(currentLesson.id, seconds)}
                  onEnded={() => !currentLesson.completed && handleMarkComplete(currentLesson.id)}
                />
              )}

              {currentLesson.type === 'TEXT' && currentLesson.content && (
                <div className="text-sm text-text-primary leading-relaxed">
                  <LatexRenderer content={currentLesson.content} />
                </div>
              )}

              {currentLesson.type === 'QUIZ' && currentLesson.test && (
                <Link href={`/tests/${currentLesson.test.id}/solve`} className="btn-primary inline-flex items-center gap-2 text-sm">
                  <ListChecks size={16} /> Tekshiruvni boshlash ({currentLesson.test.questionCount} savol)
                </Link>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                {currentLesson.completed ? (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Tugatilgan
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkComplete(currentLesson.id)}
                    disabled={marking}
                    className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm disabled:opacity-50"
                  >
                    {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Tugatdim deb belgilash
                  </button>
                )}
                {currentIndex >= 0 && currentIndex < allLessons.length - 1 && (
                  <button
                    onClick={() => setCurrentLessonId(allLessons[currentIndex + 1].id)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1.5"
                  >
                    Keyingi dars <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="card p-12 text-center text-text-secondary">Dars topilmadi</div>
          )}
        </div>

        {/* Curriculum nav */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="card p-4 space-y-4 lg:sticky lg:top-20">
            {course.sections.map((section, sIdx) => (
              <div key={section.id}>
                <p className="text-xs font-bold text-text-secondary mb-2">{sIdx + 1}. {section.titleUz}</p>
                <div className="space-y-1">
                  {section.lessons.map((lesson) => {
                    const Icon = LESSON_ICONS[lesson.type];
                    const isActive = lesson.id === currentLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonId(lesson.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                          isActive ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle size={14} className="text-gray-300 flex-shrink-0" />
                        )}
                        <Icon size={12} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{lesson.titleUz}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
