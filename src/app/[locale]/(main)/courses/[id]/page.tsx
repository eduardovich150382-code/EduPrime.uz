'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import CoursePurchasePanel, { CoursePurchaseStickyBar } from '@/components/course/CoursePurchasePanel';
import CourseStats from '@/components/course/CourseStats';
import CourseFaq from '@/components/course/CourseFaq';
import {
  GraduationCap, Clock, Layers, Loader2, User, Lock, Play, FileText,
  ListChecks, Sparkles, AlertCircle, Star, Trash2, Send,
  ChevronDown, ChevronRight, CheckCircle2, BookOpen,
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
  trailerVideoUrl: string | null;
  whatYoullLearn: string[];
  prerequisites: string | null;
  subject: { nameUz: string; icon: string | null };
  teacherId: string;
  teacherName: string | null;
  accessType: string;
  price: number;
  isFree: boolean;
  difficulty: number | null;
  estimatedHours: number | null;
  sections: SectionItem[];
  isEnrolled: boolean;
  hasAccess: boolean;
  pendingPayment: boolean;
  avgRating: number | null;
  reviewCount: number;
}

interface TeacherCourseItem {
  id: string;
  titleUz: string;
  coverImage: string | null;
  isFree: boolean;
  accessType: string;
  price: number;
  lessonCount: number;
  avgRating: number | null;
  reviewCount: number;
}

interface TeacherProfile {
  id: string;
  name: string | null;
  bio: string | null;
  rating: number;
  subject: { nameUz: string; icon: string | null };
  courses: TeacherCourseItem[];
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
  const [teacherPanelOpen, setTeacherPanelOpen] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [teacherProfileLoading, setTeacherProfileLoading] = useState(false);
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

  const handleToggleTeacherPanel = () => {
    const opening = !teacherPanelOpen;
    setTeacherPanelOpen(opening);
    if (opening && !teacherProfile && course?.teacherId) {
      setTeacherProfileLoading(true);
      fetch(`/api/teachers/${course.teacherId}`)
        .then((res) => res.json())
        .then((data) => { if (data.teacher) setTeacherProfile(data.teacher); })
        .catch(() => {})
        .finally(() => setTeacherProfileLoading(false));
    }
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
        {course.trailerVideoUrl ? (
          <SecureYouTubePlayer videoUrl={course.trailerVideoUrl} title={course.titleUz} />
        ) : (
          <div className="h-48 sm:h-56 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center relative">
            {course.coverImage ? (
              <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <GraduationCap size={56} className="text-white/80" />
            )}
          </div>
        )}
        <div className="p-6">
          <span className="text-xs text-text-secondary">{course.subject.icon} {course.subject.nameUz}</span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1 mb-2">{course.titleUz}</h1>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {course.teacherName && (
              <button
                type="button"
                onClick={handleToggleTeacherPanel}
                className="text-sm text-text-secondary hover:text-primary-600 flex items-center gap-1.5 transition-colors"
              >
                <User size={14} /> {course.teacherName}
                {teacherPanelOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            )}
            {course.avgRating !== null && (
              <p className="text-sm text-amber-600 flex items-center gap-1.5">
                <Star size={14} className="fill-amber-500 text-amber-500" /> {course.avgRating}
                <span className="text-text-secondary">({course.reviewCount} sharh)</span>
              </p>
            )}
          </div>

          {teacherPanelOpen && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-gray-50/50">
              {teacherProfileLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-primary-600" />
                </div>
              ) : teacherProfile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">{teacherProfile.name}</p>
                    {teacherProfile.rating > 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Star size={12} className="fill-amber-500 text-amber-500" /> {teacherProfile.rating}
                      </p>
                    )}
                  </div>
                  {teacherProfile.bio && <p className="text-xs text-text-secondary">{teacherProfile.bio}</p>}
                  {teacherProfile.courses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-2">Boshqa kurslari</p>
                      <div className="space-y-1.5">
                        {teacherProfile.courses.filter((c) => c.id !== course.id).map((c) => (
                          <Link
                            key={c.id}
                            href={`/courses/${c.id}`}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white border border-border hover:border-primary-200 transition-colors text-xs"
                          >
                            <BookOpen size={13} className="text-primary-500 flex-shrink-0" />
                            <span className="flex-1 text-text-primary truncate">{c.titleUz}</span>
                            <span className="text-text-secondary flex-shrink-0">{c.lessonCount} dars</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-secondary">Ma&apos;lumot topilmadi</p>
              )}
            </div>
          )}

          {course.description && <p className="text-sm text-text-secondary mb-4">{course.description}</p>}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><Layers size={14} /> {course.sections.length} bo&apos;lim, {totalLessons} dars</span>
            {course.estimatedHours ? <span className="flex items-center gap-1.5"><Clock size={14} /> ~{course.estimatedHours} soat</span> : null}
          </div>
        </div>
      </motion.div>

      {/* Enrollment CTA — S25: xarid oqimining o'zi CoursePurchasePanel'da,
          bu yerda faqat joylashtiriladi. Hozircha kvitansiya/admin
          tasdiqlashi (Payment) — kelajakda avtomatik shlyuz qo'shilsa FAQAT
          shu komponent almashadi, bu sahifa o'zgarmaydi. */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
        <CoursePurchasePanel course={course} enrolling={enrolling} onEnroll={handleEnroll} variant="full" />
      </motion.div>

      {/* Mobilda pastga yopishtirilgan doimiy xarid paneli — S25 4-band. */}
      <CoursePurchaseStickyBar course={course} enrolling={enrolling} onEnroll={handleEnroll} />

      {/* Nimani o'rganasiz — S25: Dastur (curriculum)dan OLDIN, "Kimlar
          uchun" esa Dastur'dan KEYIN chiqadi (sahifa tuzilishi shu tartibda). */}
      {course.whatYoullLearn.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6">
          <h2 className="font-semibold text-text-primary mb-3">Nimani o&apos;rganasiz</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {course.whatYoullLearn.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-primary">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
                              <FileText size={14} /> PDF&apos;ni ochish
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

      {/* Kimlar uchun — S25: Dastur'dan KEYIN chiqadi. */}
      {course.prerequisites && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1.5">Kimlar uchun</h3>
          <p className="text-sm text-text-secondary">{course.prerequisites}</p>
        </motion.div>
      )}

      {/* Kurs tarkibi raqamlarda — S25 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <CourseStats
          lessons={course.sections.flatMap((s) => s.lessons)}
          estimatedHours={course.estimatedHours}
        />
      </motion.div>

      {/* Savol-javob — S25 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="card p-6">
        <CourseFaq />
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
