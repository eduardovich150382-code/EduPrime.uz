'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileUp, Layers, Save, Loader2, Send, GraduationCap, Eye } from 'lucide-react';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import StringListEditor from '@/components/teacher/StringListEditor';
import CourseCurriculumEditor, {
  createEmptySection, createEmptyLesson, type SectionForm, type TeacherTestItem,
} from '@/components/teacher/CourseCurriculumEditor';

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

function genKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teacherTests, setTeacherTests] = useState<TeacherTestItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'info' | 'curriculum'>('info');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const draftSaveInFlightRef = useRef(false);
  const draftReadyRef = useRef(false); // dastlabki yuklash tugagunicha avtosaqlash ishga tushmasin

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
    trailerVideoUrl: '',
    whatYoullLearn: [] as string[],
    prerequisites: '',
  });

  const [sections, setSections] = useState<SectionForm[]>([createEmptySection()]);

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
          trailerVideoUrl: c.trailerVideoUrl || '',
          whatYoullLearn: c.whatYoullLearn || [],
          prerequisites: c.prerequisites || '',
        });
        if (c.sections && c.sections.length > 0) {
          setSections(c.sections.map((s: any) => ({
            _key: genKey(),
            id: s.id,
            titleUz: s.titleUz,
            lessons: s.lessons.length > 0 ? s.lessons.map((l: any) => ({
              _key: genKey(),
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
              checkpoints: l.checkpoints || [],
              blocks: (l.blocks || []).map((b: any) => ({
                id: b.id,
                type: b.type,
                labelUz: b.labelUz || '',
                fileUrl: b.fileUrl || '',
                videoUrl: b.videoUrl || '',
                testId: b.testId || '',
                revealAfterQuiz: !!b.revealAfterQuiz,
                embedUrl: b.embedUrl || '',
                itemIds: b.itemIds || [],
                checkpoints: b.checkpoints || [],
              })),
            })) : [createEmptyLesson()],
          })));
        }
      }
      setLoading(false);
      // Yuklash tugaganidan keyingina avtosaqlash ishga tushsin — aks holda
      // dastlabki setSections chaqiruvi ham "o'zgarish" deb hisoblanib,
      // hech narsa o'zgarmagan holda darhol serverga PUT ketishi mumkin.
      draftReadyRef.current = true;
    }).catch((error) => {
      console.error('Error loading course:', error);
      setLoading(false);
      draftReadyRef.current = true;
    });
  }, [courseId]);

  const buildCurriculumPayload = (secs: SectionForm[]) => {
    const validSections = secs.filter((s) => s.titleUz.trim());
    return {
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
          checkpoints: l.type === 'VIDEO' ? l.checkpoints : [],
          blocks: l.blocks.map((b) => ({
            id: b.id,
            type: b.type,
            labelUz: b.labelUz || null,
            fileUrl: b.type === 'FILE' ? b.fileUrl || null : null,
            videoUrl: b.type === 'VIDEO_SOLUTION' ? b.videoUrl || null : null,
            testId: b.type === 'QUIZ' ? b.testId || null : null,
            revealAfterQuiz: b.type === 'VIDEO_SOLUTION' ? !!b.revealAfterQuiz : false,
            embedUrl: b.type === 'EMBED' ? b.embedUrl || null : null,
            itemIds: b.type === 'PRACTICE' ? b.itemIds : [],
            checkpoints: b.type === 'VIDEO_SOLUTION' ? b.checkpoints : [],
          })),
        })),
      })),
    };
  };

  // Fon rejimida avtosaqlash — test yaratish sahifasidagi bilan bir xil
  // naqsh (har 30 soniyada), faqat dastlabki yuklash tugagach.
  useEffect(() => {
    if (!draftReadyRef.current) return;
    const saveDraft = async () => {
      if (draftSaveInFlightRef.current) return;
      const hasContent = sections.some((s) => s.titleUz.trim() && s.lessons.some((l) => l.titleUz.trim()));
      if (!hasContent) return;
      draftSaveInFlightRef.current = true;
      try {
        const res = await fetch(`/api/teacher/courses/${courseId}/curriculum`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildCurriculumPayload(sections)),
        });
        if (res.ok) {
          setLastSaved(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch {
        // Tarmoq xatosi — keyingi avtosaqlash urinishida davom etadi.
      } finally {
        draftSaveInFlightRef.current = false;
      }
    };
    const timer = setInterval(saveDraft, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, courseId, loading]);

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
          trailerVideoUrl: courseInfo.trailerVideoUrl || null,
          whatYoullLearn: courseInfo.whatYoullLearn,
          prerequisites: courseInfo.prerequisites || null,
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
      const res = await fetch(`/api/teacher/courses/${courseId}/curriculum`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCurriculumPayload(sections)),
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

      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        {currentStep === 'curriculum' && (
          <div className="flex items-center gap-3">
            {lastSaved && <span className="text-xs text-text-secondary">Oxirgi saqlash: {lastSaved}</span>}
            <a
              href={`/courses/${courseId}/learn`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-border bg-white text-text-secondary hover:border-primary-200 hover:text-primary-600 transition-colors"
            >
              <Eye size={14} /> Talaba ko&apos;zi bilan ko&apos;rish
            </a>
          </div>
        )}
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
            <label className="text-sm font-medium text-text-primary block mb-2">Tanishtiruv video (YouTube, ixtiyoriy)</label>
            <input
              type="url"
              value={courseInfo.trailerVideoUrl}
              onChange={(e) => setCourseInfo({ ...courseInfo, trailerVideoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
            <p className="text-xs text-text-secondary mt-1.5">Kurs sahifasida muqova rasmi o&apos;rniga ko&apos;rsatiladi.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Nimani o&apos;rganasiz (ixtiyoriy)</label>
            <StringListEditor
              value={courseInfo.whatYoullLearn}
              onChange={(whatYoullLearn) => setCourseInfo({ ...courseInfo, whatYoullLearn })}
              placeholder="Masalan: Kvadrat tenglamalarni yechish"
              addLabel="Band qo'shish"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Kimlar uchun / oldindan talab qilinadigan bilim (ixtiyoriy)</label>
            <textarea
              value={courseInfo.prerequisites}
              onChange={(e) => setCourseInfo({ ...courseInfo, prerequisites: e.target.value })}
              placeholder="Masalan: 8-sinf matematika darajasi yetarli"
              rows={2}
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
          <CourseCurriculumEditor
            sections={sections}
            onSectionsChange={setSections}
            teacherTests={teacherTests}
            onTeacherTestsChange={setTeacherTests}
            subjectId={courseInfo.subjectId}
          />

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
