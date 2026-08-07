'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import {
  GraduationCap, Clock, Layers, Loader2, User, Lock, Play, FileText,
  ListChecks, CheckCircle2, Sparkles, AlertCircle, ArrowRight,
} from 'lucide-react';

interface LessonItem {
  id: string;
  titleUz: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';
  durationMinutes: number | null;
  isPreviewable: boolean;
  videoUrl?: string | null;
  content?: string | null;
  test?: { id: string; titleUz: string; questionCount: number; duration: number } | null;
}

interface SectionItem {
  id: string;
  titleUz: string;
  lessons: LessonItem[];
}

interface CourseDetail {
  id: string;
  titleUz: string;
  description: string | null;
  coverImage: string | null;
  subject: { nameUz: string; icon: string | null };
  teacherName: string | null;
  accessType: string;
  price: number;
  isFree: boolean;
  difficulty: number | null;
  estimatedHours: number | null;
  sections: SectionItem[];
  isEnrolled: boolean;
  hasAccess: boolean;
}

const LESSON_ICONS = { VIDEO: Play, TEXT: FileText, QUIZ: ListChecks, PDF: FileText };

const ACCESS_LABELS: Record<string, string> = {
  free: 'Bepul',
  premium: 'Premium tarifi',
  teacher: 'Ustoz tarifi',
  premium_teacher: 'Premium yoki Ustoz tarifi',
  paid: 'Narxli',
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const fetchCourse = () => {
    fetch(`/api/courses/${courseId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Kurs topilmadi');
          return;
        }
        setCourse(data.course);
      })
      .catch(() => setError("Server bilan bog'lanishda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchCourse();
      } else if (res.status === 403) {
        // Access denied — course state already reflects accessType/price, CTA below handles it
        alert(data.message || "Bu kursga kirish uchun tarifingizni yangilang yoki sotib oling.");
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setEnrolling(false);
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
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-text-secondary">{error || 'Kurs topilmadi'}</p>
      </div>
    );
  }

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="h-48 sm:h-56 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center relative">
          {course.coverImage ? (
            <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <GraduationCap size={56} className="text-white/80" />
          )}
        </div>
        <div className="p-6">
          <span className="text-xs text-text-secondary">{course.subject.icon} {course.subject.nameUz}</span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1 mb-2">{course.titleUz}</h1>
          {course.teacherName && (
            <p className="text-sm text-text-secondary flex items-center gap-1.5 mb-3">
              <User size={14} /> {course.teacherName}
            </p>
          )}
          {course.description && <p className="text-sm text-text-secondary mb-4">{course.description}</p>}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><Layers size={14} /> {course.sections.length} bo&apos;lim, {totalLessons} dars</span>
            {course.estimatedHours ? <span className="flex items-center gap-1.5"><Clock size={14} /> ~{course.estimatedHours} soat</span> : null}
          </div>
        </div>
      </motion.div>

      {/* Enrollment CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
        {course.isEnrolled ? (
          <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl p-4">
            <CheckCircle2 size={22} className="flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Siz bu kursga yozilgansiz</p>
              <p className="text-xs text-green-600 mt-0.5">To&apos;liq dars pleyeri tez orada qo&apos;shiladi — hozircha bepul namuna darslarni pastda ko&apos;rishingiz mumkin.</p>
            </div>
          </div>
        ) : course.hasAccess ? (
          <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {enrolling ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {course.isFree ? 'Bepul yozilish' : 'Yozilish'}
          </button>
        ) : course.accessType === 'paid' ? (
          <a
            href={`https://t.me/EduPrimeuzbot?start=buy_course_${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Sotib olish — {course.price.toLocaleString()} so&apos;m
          </a>
        ) : (
          <div className="text-center">
            <Lock size={22} className="text-primary-400 mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-3">
              Bu kursga kirish uchun <strong>{ACCESS_LABELS[course.accessType]}</strong> kerak.
            </p>
            <Link href="/pricing" className="btn-primary inline-flex items-center gap-2">
              Tariflar sahifasi
            </Link>
          </div>
        )}
      </motion.div>

      {/* Curriculum */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
        <h2 className="font-semibold text-text-primary mb-4">Dastur</h2>
        <div className="space-y-4">
          {course.sections.map((section, sIdx) => (
            <div key={section.id}>
              <p className="text-xs font-bold text-primary-600 bg-primary-50 inline-block px-2 py-1 rounded-full mb-2">
                {sIdx + 1}. {section.titleUz}
              </p>
              <div className="space-y-1.5 pl-1">
                {section.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type];
                  const isExpanded = expandedLessonId === lesson.id;
                  return (
                    <div key={lesson.id} className="rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => lesson.isPreviewable && setExpandedLessonId(isExpanded ? null : lesson.id)}
                        disabled={!lesson.isPreviewable}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          lesson.isPreviewable ? 'hover:bg-primary-50/50 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <Icon size={16} className={lesson.isPreviewable ? 'text-primary-500' : 'text-text-secondary'} />
                        <span className="flex-1 text-sm text-text-primary">{lesson.titleUz}</span>
                        {lesson.durationMinutes ? (
                          <span className="text-xs text-text-secondary">{lesson.durationMinutes} daq</span>
                        ) : null}
                        {lesson.isPreviewable ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 flex items-center gap-1">
                            <Sparkles size={10} /> Namuna
                          </span>
                        ) : (
                          <Lock size={14} className="text-text-secondary" />
                        )}
                      </button>
                      {isExpanded && lesson.isPreviewable && (
                        <div className="p-4 border-t border-border bg-gray-50/50">
                          {lesson.type === 'VIDEO' && lesson.videoUrl && (
                            <SecureYouTubePlayer videoUrl={lesson.videoUrl} title={lesson.titleUz} onClose={() => setExpandedLessonId(null)} />
                          )}
                          {lesson.type === 'TEXT' && lesson.content && (
                            <div className="text-sm text-text-primary">
                              <LatexRenderer content={lesson.content} />
                            </div>
                          )}
                          {lesson.type === 'QUIZ' && lesson.test && (
                            <Link href={`/tests/${lesson.test.id}/solve`} className="btn-primary inline-flex items-center gap-2 text-sm !py-2 !px-4">
                              <ListChecks size={14} /> Tekshiruvni boshlash ({lesson.test.questionCount} savol)
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
