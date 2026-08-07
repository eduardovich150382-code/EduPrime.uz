'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, Send, FileUp, Layers,
  ChevronUp, ChevronDown, Video, FileText, ListChecks, GraduationCap, Sparkles,
} from 'lucide-react';
import ImageUploadButton from '@/components/ui/ImageUploadButton';

type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';

interface LessonForm {
  id?: string;
  titleUz: string;
  type: LessonType;
  videoUrl: string;
  content: string;
  testId: string;
  fileUrl: string;
  minPassPercent: number | '';
  durationMinutes: number | '';
  isPreviewable: boolean;
}

interface SectionForm {
  id?: string;
  titleUz: string;
  lessons: LessonForm[];
}

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

interface TeacherTestItem {
  id: string;
  titleUz: string;
}

const emptyLesson: LessonForm = {
  titleUz: '', type: 'VIDEO', videoUrl: '', content: '', testId: '', fileUrl: '', minPassPercent: '', durationMinutes: '', isPreviewable: false,
};

const LESSON_TYPE_META: Record<LessonType, { label: string; icon: typeof Video }> = {
  VIDEO: { label: 'Video', icon: Video },
  TEXT: { label: 'Matn', icon: FileText },
  QUIZ: { label: 'Tekshiruv', icon: ListChecks },
  PDF: { label: 'PDF', icon: FileUp },
};

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teacherTests, setTeacherTests] = useState<TeacherTestItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'info' | 'curriculum'>('info');
  const [uploadingPdfKey, setUploadingPdfKey] = useState<string | null>(null);
  const [generatingQuizKey, setGeneratingQuizKey] = useState<string | null>(null);

  const [courseInfo, setCourseInfo] = useState({
    titleUz: '',
    subjectId: '',
    description: '',
    coverImage: '',
    accessType: 'free' as 'free' | 'premium' | 'teacher' | 'premium_teacher' | 'paid',
    price: 0,
    difficulty: 0,
    estimatedHours: 0,
    isPublished: false,
    sequentialUnlock: false,
  });

  const [sections, setSections] = useState<SectionForm[]>([{ titleUz: '', lessons: [{ ...emptyLesson }] }]);

  useEffect(() => {
    Promise.all([
      fetch('/api/subjects').then((r) => r.json()),
      fetch('/api/teacher/tests').then((r) => r.json()),
      fetch(`/api/teacher/courses/${courseId}`).then((r) => r.json()),
    ]).then(([subjectsData, testsData, courseData]) => {
      if (subjectsData.subjects) setSubjects(subjectsData.subjects);
      if (testsData.tests) setTeacherTests(testsData.tests.map((t: any) => ({ id: t.id, titleUz: t.titleUz })));
      if (courseData.course) {
        const c = courseData.course;
        setCourseInfo({
          titleUz: c.titleUz || '',
          subjectId: c.subjectId || '',
          description: c.description || '',
          coverImage: c.coverImage || '',
          accessType: c.accessType || 'free',
          price: c.price || 0,
          difficulty: c.difficulty || 0,
          estimatedHours: c.estimatedHours || 0,
          isPublished: c.isPublished || false,
          sequentialUnlock: c.sequentialUnlock || false,
        });
        if (c.sections && c.sections.length > 0) {
          setSections(c.sections.map((s: any) => ({
            id: s.id,
            titleUz: s.titleUz,
            lessons: s.lessons.length > 0 ? s.lessons.map((l: any) => ({
              id: l.id,
              titleUz: l.titleUz,
              type: l.type,
              videoUrl: l.videoUrl || '',
              content: l.content || '',
              testId: l.testId || '',
              fileUrl: l.fileUrl || '',
              minPassPercent: l.minPassPercent ?? '',
              durationMinutes: l.durationMinutes ?? '',
              isPreviewable: l.isPreviewable || false,
            })) : [{ ...emptyLesson }],
          })));
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading course:', error);
      setLoading(false);
    });
  }, [courseId]);

  // ---- Section/lesson helpers (identical to create page) ----
  const addSection = () => setSections([...sections, { titleUz: '', lessons: [{ ...emptyLesson }] }]);
  const removeSection = (i: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, idx) => idx !== i));
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const updated = [...sections];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    setSections(updated);
  };
  const updateSectionTitle = (i: number, titleUz: string) => {
    const updated = [...sections];
    updated[i] = { ...updated[i], titleUz };
    setSections(updated);
  };
  const addLesson = (sIdx: number) => {
    const updated = [...sections];
    updated[sIdx] = { ...updated[sIdx], lessons: [...updated[sIdx].lessons, { ...emptyLesson }] };
    setSections(updated);
  };
  const removeLesson = (sIdx: number, lIdx: number) => {
    const updated = [...sections];
    if (updated[sIdx].lessons.length <= 1) return;
    updated[sIdx] = { ...updated[sIdx], lessons: updated[sIdx].lessons.filter((_, idx) => idx !== lIdx) };
    setSections(updated);
  };
  const moveLesson = (sIdx: number, lIdx: number, dir: -1 | 1) => {
    const j = lIdx + dir;
    const lessons = sections[sIdx].lessons;
    if (j < 0 || j >= lessons.length) return;
    const updated = [...sections];
    const newLessons = [...lessons];
    [newLessons[lIdx], newLessons[j]] = [newLessons[j], newLessons[lIdx]];
    updated[sIdx] = { ...updated[sIdx], lessons: newLessons };
    setSections(updated);
  };
  const updateLesson = (sIdx: number, lIdx: number, patch: Partial<LessonForm>) => {
    const updated = [...sections];
    const lessons = [...updated[sIdx].lessons];
    lessons[lIdx] = { ...lessons[lIdx], ...patch };
    updated[sIdx] = { ...updated[sIdx], lessons };
    setSections(updated);
  };

  const insertLessonAfter = (sIdx: number, lIdx: number, lesson: LessonForm) => {
    const updated = [...sections];
    const lessons = [...updated[sIdx].lessons];
    lessons.splice(lIdx + 1, 0, lesson);
    updated[sIdx] = { ...updated[sIdx], lessons };
    setSections(updated);
  };

  const handlePdfUpload = async (sIdx: number, lIdx: number, file: File) => {
    const key = `${sIdx}-${lIdx}`;
    if (file.size > 8 * 1024 * 1024) {
      alert("Fayl hajmi 8 MB dan oshmasligi kerak");
      return;
    }
    setUploadingPdfKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?endpoint=aiImportFile', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        updateLesson(sIdx, lIdx, { fileUrl: data.url });
      } else {
        alert(data.error || 'Faylni yuklashda xatolik');
      }
    } catch {
      alert('Faylni yuklashda xatolik');
    }
    setUploadingPdfKey(null);
  };

  const handleGenerateQuiz = async (sIdx: number, lIdx: number) => {
    const lesson = sections[sIdx].lessons[lIdx];
    if (!lesson.content || lesson.content.trim().length < 20) {
      alert("Avval dars matnini kiriting (kamida bir necha jumla)!");
      return;
    }
    if (!courseInfo.subjectId) {
      alert("Avval 'Kurs ma'lumotlari' qadamida fanni tanlang!");
      return;
    }
    const key = `${sIdx}-${lIdx}`;
    setGeneratingQuizKey(key);
    try {
      const res = await fetch('/api/ai/quiz-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: lesson.content,
          subjectId: courseInfo.subjectId,
          titleUz: `AI tekshiruv: ${lesson.titleUz || 'dars'}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
        setGeneratingQuizKey(null);
        return;
      }
      setTeacherTests((prev) => [...prev, { id: data.test.id, titleUz: data.test.titleUz }]);
      insertLessonAfter(sIdx, lIdx, {
        ...emptyLesson,
        titleUz: data.test.titleUz,
        type: 'QUIZ',
        testId: data.test.id,
      });
      alert(`✅ ${data.test.questionCount} ta savolli tekshiruv yaratildi va shu darsdan keyin qo'shildi!`);
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
    setGeneratingQuizKey(null);
  };

  const handleSaveInfo = async () => {
    if (!courseInfo.titleUz || !courseInfo.subjectId) {
      alert("Kurs nomi va fan tanlash majburiy!");
      return;
    }
    setSaving(true);
    try {
      const isFree = courseInfo.accessType === 'free';
      const res = await fetch(`/api/teacher/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleUz: courseInfo.titleUz,
          description: courseInfo.description || null,
          coverImage: courseInfo.coverImage || null,
          subjectId: courseInfo.subjectId,
          accessType: courseInfo.accessType,
          price: isFree ? 0 : courseInfo.price,
          difficulty: courseInfo.difficulty || null,
          estimatedHours: courseInfo.estimatedHours || null,
          sequentialUnlock: courseInfo.sequentialUnlock,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
        setSaving(false);
        return;
      }
      setCurrentStep('curriculum');
    } catch {
      alert("Server xatolik. Qayta urinib ko'ring.");
    }
    setSaving(false);
  };

  const saveCurriculum = async (publish: boolean) => {
    const validSections = sections.filter((s) => s.titleUz.trim());
    if (validSections.length === 0) {
      alert("Kamida 1 ta bo'lim va nomi kiritilishi kerak!");
      return;
    }
    for (const s of validSections) {
      if (s.lessons.filter((l) => l.titleUz.trim()).length === 0) {
        alert(`"${s.titleUz}" bo'limida kamida 1 ta dars bo'lishi kerak!`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        sections: validSections.map((s) => ({
          id: s.id,
          titleUz: s.titleUz,
          lessons: s.lessons.filter((l) => l.titleUz.trim()).map((l) => ({
            id: l.id,
            titleUz: l.titleUz,
            type: l.type,
            videoUrl: l.type === 'VIDEO' ? l.videoUrl || null : null,
            content: l.type === 'TEXT' ? l.content || null : null,
            testId: l.type === 'QUIZ' ? l.testId || null : null,
            fileUrl: l.type === 'PDF' ? l.fileUrl || null : null,
            minPassPercent: l.type === 'QUIZ' && l.minPassPercent !== '' ? l.minPassPercent : null,
            durationMinutes: l.durationMinutes === '' ? null : l.durationMinutes,
            isPreviewable: l.isPreviewable,
          })),
        })),
      };

      const res = await fetch(`/api/teacher/courses/${courseId}/curriculum`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
        setSaving(false);
        return;
      }

      if (publish) {
        await fetch(`/api/teacher/courses/${courseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: true }),
        });
      }

      alert(publish ? 'Kurs yangilandi va nashr qilindi!' : 'Kurs yangilandi (qoralama)!');
      router.push('/teacher/courses');
    } catch {
      alert("Server xatolik. Qayta urinib ko'ring.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher/courses" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <GraduationCap size={22} className="text-primary-600" /> Kursni tahrirlash
            </h1>
            <p className="text-sm text-text-secondary">Ma&apos;lumot va dasturni yangilang</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2">
        {[
          { id: 'info' as const, label: "Kurs ma'lumotlari", icon: FileUp },
          { id: 'curriculum' as const, label: `Dastur (${sections.length})`, icon: Layers },
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStep === step.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            <step.icon size={16} />
            {step.label}
          </button>
        ))}
      </div>

      {currentStep === 'info' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Kurs nomi *</label>
              <input
                type="text"
                value={courseInfo.titleUz}
                onChange={(e) => setCourseInfo({ ...courseInfo, titleUz: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
              <select
                value={courseInfo.subjectId}
                onChange={(e) => setCourseInfo({ ...courseInfo, subjectId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Fan tanlang...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.nameUz} ({s.category.nameUz})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Taxminiy davomiyligi (soat, ixtiyoriy)</label>
              <input
                type="text"
                inputMode="decimal"
                value={courseInfo.estimatedHours || ''}
                onChange={(e) => {
                  const num = parseFloat(e.target.value);
                  setCourseInfo({ ...courseInfo, estimatedHours: isNaN(num) ? 0 : num });
                }}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Tavsif (ixtiyoriy)</label>
            <textarea
              value={courseInfo.description}
              onChange={(e) => setCourseInfo({ ...courseInfo, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-3">Kurs kirish turi *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {([
                { key: 'free' as const, label: 'Bepul', desc: 'Hammaga ochiq', color: 'border-green-300 bg-green-50 text-green-700' },
                { key: 'premium' as const, label: 'Premium', desc: 'Premium tarifi', color: 'border-purple-300 bg-purple-50 text-purple-700' },
                { key: 'teacher' as const, label: 'Ustoz', desc: 'Ustoz tarifi', color: 'border-blue-300 bg-blue-50 text-blue-700' },
                { key: 'premium_teacher' as const, label: 'Premium + Ustoz', desc: 'Ikkala tarif', color: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
                { key: 'paid' as const, label: 'Narxli', desc: 'Alohida sotib olish', color: 'border-orange-300 bg-orange-50 text-orange-700' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setCourseInfo({ ...courseInfo, accessType: opt.key })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    courseInfo.accessType === opt.key ? `${opt.color} shadow-sm` : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {courseInfo.accessType === 'paid' && (
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm font-medium text-text-primary">Narx:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={courseInfo.price || ''}
                  onChange={(e) => {
                    const num = parseInt(e.target.value);
                    setCourseInfo({ ...courseInfo, price: isNaN(num) ? 0 : num });
                  }}
                  className="w-32 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                />
                <span className="text-sm text-text-secondary">so&apos;m</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border bg-gray-50/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={courseInfo.sequentialUnlock}
                onChange={(e) => setCourseInfo({ ...courseInfo, sequentialUnlock: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary-600"
              />
              <span className="text-sm font-medium text-text-primary">Darslarni ketma-ket ochish</span>
            </label>
            <p className="text-xs text-text-secondary mt-1.5 ml-7">
              Yoqilsa, talaba keyingi darsni faqat oldingi darsni tugatgach (Tekshiruv darsida — belgilangan minimal foizdan o&apos;tgach) ocha oladi.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Muqova rasmi (ixtiyoriy)</label>
            <div className="flex items-center gap-4">
              <ImageUploadButton endpoint="questionImage" label="Rasm yuklash" onUpload={(url) => setCourseInfo({ ...courseInfo, coverImage: url })} />
              {courseInfo.coverImage && <span className="text-xs text-green-600 font-medium">Rasm yuklandi</span>}
            </div>
            {courseInfo.coverImage && (
              <div className="mt-3 relative inline-block">
                <img src={courseInfo.coverImage} alt="Kurs muqovasi" className="h-32 w-auto object-cover rounded-xl border border-border" />
                <button type="button" onClick={() => setCourseInfo({ ...courseInfo, coverImage: '' })} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors">&times;</button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSaveInfo} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Saqlash
            </button>
          </div>
        </motion.div>
      )}

      {currentStep === 'curriculum' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button onClick={() => moveSection(sIdx, 1)} disabled={sIdx === sections.length - 1} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full flex-shrink-0">{sIdx + 1}-bo&apos;lim</span>
                <input
                  type="text"
                  value={section.titleUz}
                  onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                  placeholder="Bo'lim nomi"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm font-medium"
                />
                <button onClick={() => removeSection(sIdx)} disabled={sections.length <= 1} className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-3 pl-8">
                {section.lessons.map((lesson, lIdx) => {
                  const TypeIcon = LESSON_TYPE_META[lesson.type].icon;
                  return (
                    <div key={lIdx} className="p-4 rounded-xl border border-border bg-gray-50/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <button onClick={() => moveLesson(sIdx, lIdx, -1)} disabled={lIdx === 0} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20"><ChevronUp size={12} /></button>
                          <button onClick={() => moveLesson(sIdx, lIdx, 1)} disabled={lIdx === section.lessons.length - 1} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20"><ChevronDown size={12} /></button>
                        </div>
                        <TypeIcon size={16} className="text-primary-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={lesson.titleUz}
                          onChange={(e) => updateLesson(sIdx, lIdx, { titleUz: e.target.value })}
                          placeholder="Dars nomi"
                          className="flex-1 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                        />
                        <button onClick={() => removeLesson(sIdx, lIdx)} disabled={section.lessons.length <= 1} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pl-6">
                        <div className="inline-flex rounded-lg border border-border overflow-hidden">
                          {(Object.keys(LESSON_TYPE_META) as LessonType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => updateLesson(sIdx, lIdx, { type: t })}
                              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                                lesson.type === t ? 'bg-primary-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                              }`}
                            >
                              {LESSON_TYPE_META[t].label}
                            </button>
                          ))}
                        </div>

                        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                          Daqiqa:
                          <input
                            type="text"
                            inputMode="numeric"
                            value={lesson.durationMinutes}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseInt(val);
                              updateLesson(sIdx, lIdx, { durationMinutes: val === '' ? '' : (isNaN(num) ? '' : num) });
                            }}
                            placeholder="10"
                            className="w-16 px-2 py-1 rounded-lg border border-border text-center text-xs"
                          />
                        </label>

                        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lesson.isPreviewable}
                            onChange={(e) => updateLesson(sIdx, lIdx, { isPreviewable: e.target.checked })}
                            className="w-3.5 h-3.5 rounded border-border text-primary-600"
                          />
                          Bepul namuna
                        </label>
                      </div>

                      <div className="pl-6">
                        {lesson.type === 'VIDEO' && (
                          <input
                            type="url"
                            value={lesson.videoUrl}
                            onChange={(e) => updateLesson(sIdx, lIdx, { videoUrl: e.target.value })}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                          />
                        )}
                        {lesson.type === 'TEXT' && (
                          <div className="space-y-2">
                            <textarea
                              value={lesson.content}
                              onChange={(e) => updateLesson(sIdx, lIdx, { content: e.target.value })}
                              placeholder="Dars matni... (LaTeX: $formula$)"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm resize-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleGenerateQuiz(sIdx, lIdx)}
                              disabled={generatingQuizKey === `${sIdx}-${lIdx}` || !lesson.content.trim()}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {generatingQuizKey === `${sIdx}-${lIdx}` ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              AI bilan tekshiruv yasash
                            </button>
                          </div>
                        )}
                        {lesson.type === 'QUIZ' && (
                          <div className="space-y-2">
                            <select
                              value={lesson.testId}
                              onChange={(e) => updateLesson(sIdx, lIdx, { testId: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                            >
                              <option value="">Test tanlang...</option>
                              {teacherTests.map((t) => <option key={t.id} value={t.id}>{t.titleUz}</option>)}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                              O&apos;tish uchun minimal foiz (ixtiyoriy):
                              <input
                                type="text"
                                inputMode="numeric"
                                value={lesson.minPassPercent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = parseInt(val);
                                  updateLesson(sIdx, lIdx, { minPassPercent: val === '' ? '' : (isNaN(num) ? '' : Math.min(100, Math.max(1, num))) });
                                }}
                                placeholder="60"
                                className="w-16 px-2 py-1 rounded-lg border border-border text-center text-xs"
                              />
                              %
                            </label>
                          </div>
                        )}
                        {lesson.type === 'PDF' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="application/pdf"
                              id={`pdf-upload-edit-${sIdx}-${lIdx}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePdfUpload(sIdx, lIdx, file);
                                e.target.value = '';
                              }}
                            />
                            <label
                              htmlFor={`pdf-upload-edit-${sIdx}-${lIdx}`}
                              className="text-xs font-medium px-3 py-2 rounded-lg border border-border bg-white text-text-secondary hover:bg-gray-50 cursor-pointer flex items-center gap-1.5"
                            >
                              {uploadingPdfKey === `${sIdx}-${lIdx}` ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                              PDF yuklash
                            </label>
                            {lesson.fileUrl && (
                              <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                                ✓ Fayl yuklandi — ko&apos;rish
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => addLesson(sIdx)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Plus size={12} /> Dars qo&apos;shish
                </button>
              </div>
            </div>
          ))}

          <button onClick={addSection} className="w-full px-4 py-3 rounded-xl text-sm text-primary-600 hover:bg-primary-50 flex items-center justify-center gap-2 transition-colors border border-dashed border-primary-200">
            <Plus size={16} /> Bo&apos;lim qo&apos;shish
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => saveCurriculum(false)} disabled={saving} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Qoralama saqlash
            </button>
            <button onClick={() => saveCurriculum(true)} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Nashr qilish
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
