'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import {
  GraduationCap, Clock, Layers, Loader2, User, Lock, Play, FileText,
  ListChecks, Sparkles, AlertCircle, ArrowRight, Star, Trash2, Send,
} from 'lucide-react';

interface LessonBlockItem {
  id: string;
  type: 'FILE' | 'QUIZ' | 'VIDEO_SOLUTION';
  labelUz: string | null;
  fileUrl: string | null;
  videoUrl: string | null;
  test: { id: string; titleUz: string; questionCount: number; duration: number } | null;
}

interface LessonItem {
  id: string;
  titleUz: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';
  durationMinutes: number | null;
  isPreviewable: boolean;
  videoUrl?: string | null;
  content?: string | null;
  test?: { id: string; titleUz: string; questionCount: number; duration: number } | null;
  fileUrl?: string | null;
  blocks?: LessonBlockItem[];
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
  avgRating: number | null;
  reviewCount: number;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  userName: string;
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
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [revealedSolutions, setRevealedSolutions] = useState<Set<string>>(new Set());

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

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

  const fetchReviews = () => {
    fetch(`/api/courses/${courseId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setMyReview(data.myReview || null);
        if (data.myReview) {
          setRatingInput(data.myReview.rating);
          setCommentInput(data.myReview.comment || '');
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    fetchCourse();
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleSubmitReview = async () => {
    if (ratingInput < 1 || ratingInput > 5) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingInput, comment: commentInput }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchReviews();
        fetchCourse();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setSubmittingReview(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Sharhni o'chirishni tasdiqlaysizmi?")) return;
    setDeletingReviewId(reviewId);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        if (myReview?.id === reviewId) {
          setMyReview(null);
          setRatingInput(0);
          setCommentInput('');
        }
        fetchReviews();
        fetchCourse();
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch {
      alert('Server xatolik');
    }
    setDeletingReviewId(null);
  };

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
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {course.teacherName && (
              <p className="text-sm text-text-secondary flex items-center gap-1.5">
                <User size={14} /> {course.teacherName}
              </p>
            )}
            {course.avgRating !== null && (
              <p className="text-sm text-amber-600 flex items-center gap-1.5">
                <Star size={14} className="fill-amber-500 text-amber-500" /> {course.avgRating}
                <span className="text-text-secondary">({course.reviewCount} sharh)</span>
              </p>
            )}
          </div>
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
          <Link href={`/courses/${course.id}/learn`} className="btn-primary w-full flex items-center justify-center gap-2">
            <Play size={18} /> O&apos;rganishni boshlash
          </Link>
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
                          {lesson.type === 'PDF' && lesson.fileUrl && (
                            <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm !py-2 !px-4">
                              <FileText size={14} /> PDF'ni ochish
                            </a>
                          )}

                          {lesson.blocks && lesson.blocks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <p className="text-xs font-semibold text-text-secondary">Qo&apos;shimcha materiallar</p>
                              {lesson.blocks.map((block) => {
                                if (block.type === 'FILE' && block.fileUrl) {
                                  return (
                                    <a
                                      key={block.id}
                                      href={block.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-primary-600 hover:underline w-fit"
                                    >
                                      <FileText size={13} className="flex-shrink-0" /> {block.labelUz || 'Fayl'}
                                    </a>
                                  );
                                }
                                if (block.type === 'QUIZ' && block.test) {
                                  return (
                                    <Link
                                      key={block.id}
                                      href={`/tests/${block.test.id}/solve`}
                                      className="flex items-center gap-2 text-sm text-primary-600 hover:underline w-fit"
                                    >
                                      <ListChecks size={13} className="flex-shrink-0" /> {block.labelUz || "Qo'shimcha mashq"} ({block.test.questionCount} savol)
                                    </Link>
                                  );
                                }
                                if (block.type === 'VIDEO_SOLUTION' && block.videoUrl) {
                                  const revealed = revealedSolutions.has(block.id);
                                  return (
                                    <div key={block.id}>
                                      {revealed ? (
                                        <SecureYouTubePlayer videoUrl={block.videoUrl} title={block.labelUz || 'Yechim videosi'} />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setRevealedSolutions((prev) => new Set(prev).add(block.id))}
                                          className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                                        >
                                          <Play size={13} className="flex-shrink-0" /> {block.labelUz || 'Yechim videosi'}ni ko&apos;rsatish
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
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

      {/* Reviews */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6 space-y-5">
        <h2 className="font-semibold text-text-primary">
          Sharhlar {course.reviewCount > 0 && <span className="text-text-secondary font-normal">({course.reviewCount})</span>}
        </h2>

        {course.isEnrolled && (
          <div className="p-4 rounded-xl border border-border bg-gray-50/50 space-y-3">
            <p className="text-sm font-medium text-text-primary">{myReview ? 'Sharhingizni tahrirlash' : 'Sharh qoldiring'}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRatingInput(n)} className="p-0.5">
                  <Star size={22} className={n <= ratingInput ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
                </button>
              ))}
            </div>
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Kurs haqida fikringiz (ixtiyoriy)..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none"
            />
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview || ratingInput < 1}
              className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm disabled:opacity-50"
            >
              {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {myReview ? 'Yangilash' : 'Yuborish'}
            </button>
          </div>
        )}

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">
            Hali sharh yo&apos;q. {course.isEnrolled ? 'Birinchi bo\'lib fikr bildiring!' : ''}
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">{r.userName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} className={n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-text-secondary mt-1">{r.comment}</p>}
                  </div>
                  {(r.userId === userId || userRole === 'ADMIN') && (
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      disabled={deletingReviewId === r.id}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="O'chirish"
                    >
                      {deletingReviewId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
