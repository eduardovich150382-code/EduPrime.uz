'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import LatexRenderer from '@/components/ui/LatexRenderer';
import LatexToolbar from '@/components/ui/LatexToolbar';
import { BLOOM_LEVELS } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, Send,
  FileUp, CheckCircle, Bot,
} from 'lucide-react';
import ImageUploadButton, {
  ImagePreviewList, uploadImageFile, extractPastedImageFile, extractDroppedImageFile,
} from '@/components/ui/ImageUploadButton';
import {
  FILL_BLANK_MARKER, countFillBlanks, encodeFillBlankCorrectAnswer, parseFillBlankCorrectAnswer,
} from '@/lib/fill-blank';
import FillBlankEditor from '@/components/ui/FillBlankEditor';

interface QuestionForm {
  id?: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  correctAnswer: string;
  explanation: string;
  explanationImages: string[];
  videoUrl: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'TRUE_FALSE' | 'MULTI_SELECT' | 'FILL_BLANK';
  points: number;
  topic: string;
  bloomLevel: string;
  difficulty: number | null;
  blankAnswers: string[];
}

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

const emptyQuestion: QuestionForm = {
  text: '',
  images: [],
  options: [
    { label: 'A', text: '', image: null },
    { label: 'B', text: '', image: null },
    { label: 'C', text: '', image: null },
    { label: 'D', text: '', image: null },
  ],
  correctAnswer: '',
  explanation: '',
  explanationImages: [],
  videoUrl: '',
  type: 'MULTIPLE_CHOICE',
  points: 1,
  topic: '',
  bloomLevel: '',
  difficulty: null,
  blankAnswers: [''],
};

// FILL_BLANK: matndagi "___" soniga mos ravishda blankAnswers ro'yxatini hisoblaydi.
function fillBlankCorrectAnswer(q: QuestionForm): string {
  const blankCount = countFillBlanks(q.text);
  const perBlank = Array.from({ length: blankCount }, (_, i) =>
    (q.blankAnswers[i] || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  return encodeFillBlankCorrectAnswer(perBlank);
}

// Savol yaroqli hisoblanishi uchun: matn bo'lishi, va turiga qarab yoki
// to'g'ri javob (correctAnswer) yoki FILL_BLANK uchun har bir bo'shliqqa
// kamida bitta qabul qilinadigan javob to'ldirilgan bo'lishi kerak.
function isQuestionValid(q: QuestionForm): boolean {
  if (!q.text) return false;
  if (q.type === 'FILL_BLANK') {
    const blankCount = countFillBlanks(q.text);
    if (blankCount === 0) return false;
    for (let i = 0; i < blankCount; i++) {
      if (!(q.blankAnswers[i] || '').trim()) return false;
    }
    return true;
  }
  return !!q.correctAnswer;
}

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testInfo, setTestInfo] = useState({
    titleUz: '',
    subjectId: '',
    duration: 60,
    isFree: false,
    price: 0,
    accessType: 'free' as 'free' | 'premium' | 'teacher' | 'premium_teacher' | 'paid',
    difficulty: 3,
    videoSolution: '',
    coverImage: '',
    isPublished: false,
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentStep, setCurrentStep] = useState<'info' | 'questions'>('info');
  const [activeQuestion, setActiveQuestion] = useState(0);
  const questionTextRef = useRef<HTMLTextAreaElement | null>(null);
  const explanationRef = useRef<HTMLTextAreaElement | null>(null);
  const [dropUploading, setDropUploading] = useState<'question' | 'explanation' | null>(null);

  const handleImageDropOrPaste = async (file: File, target: 'question' | 'explanation') => {
    setDropUploading(target);
    try {
      const endpoint = target === 'question' ? 'questionImage' : 'solutionImage';
      const url = await uploadImageFile(file, endpoint);
      setQuestions((prev) => {
        const updated = [...prev];
        const key = target === 'question' ? 'images' : 'explanationImages';
        updated[activeQuestion] = {
          ...updated[activeQuestion],
          [key]: [...updated[activeQuestion][key], url],
        };
        return updated;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Rasm yuklashda xatolik');
    }
    setDropUploading(null);
  };

  // Fetch subjects and test data
  useEffect(() => {
    Promise.all([
      fetch('/api/subjects').then(r => r.json()),
      fetch(`/api/teacher/tests/${testId}`).then(r => r.json()),
    ]).then(([subjectsData, testData]) => {
      if (subjectsData.subjects) setSubjects(subjectsData.subjects);
      if (testData.test) {
        const test = testData.test;
        setTestInfo({
          titleUz: test.titleUz || '',
          subjectId: test.subjectId || '',
          duration: test.duration || 60,
          isFree: test.isFree || false,
          price: test.price || 0,
          accessType: test.accessType || 'free',
          difficulty: test.difficulty || 3,
          videoSolution: test.videoSolution || '',
          coverImage: test.coverImage || '',
          isPublished: test.isPublished || false,
        });
        if (test.questions && test.questions.length > 0) {
          const loadedQuestions: QuestionForm[] = test.questions.map((q: any) => ({
            id: q.id,
            text: q.text || '',
            images: q.images || [],
            options: q.options && Array.isArray(q.options) && q.options.length > 0
              ? q.options.map((o: any) => ({
                  label: o.label || '',
                  text: o.text || '',
                  image: o.image || null,
                }))
              : [
                  { label: 'A', text: '', image: null },
                  { label: 'B', text: '', image: null },
                  { label: 'C', text: '', image: null },
                  { label: 'D', text: '', image: null },
                ],
            correctAnswer: q.type === 'FILL_BLANK' ? '' : (q.correctAnswer || ''),
            explanation: q.explanation || '',
            explanationImages: q.explanationImages || [],
            videoUrl: q.videoUrl || '',
            type: q.type || 'MULTIPLE_CHOICE',
            points: q.points || 1,
            topic: q.topic || '',
            bloomLevel: q.bloomLevel || '',
            difficulty: q.difficulty ?? null,
            blankAnswers: q.type === 'FILL_BLANK'
              ? parseFillBlankCorrectAnswer(q.correctAnswer).map((accepted: string[]) => accepted.join(', '))
              : [''],
          }));
          setQuestions(loadedQuestions);
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading test:', error);
      setLoading(false);
    });
  }, [testId]);

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 5) return;
    const label = String.fromCharCode(65 + q.options.length);
    const updated = [...questions];
    updated[qIndex] = { ...q, options: [...q.options, { label, text: '', image: null }] };
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 4) return;
    const updated = [...questions];
    updated[qIndex] = { ...q, options: q.options.filter((_, i) => i !== optIndex) };
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setActiveQuestion(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
    if (activeQuestion >= questions.length - 1) setActiveQuestion(Math.max(0, questions.length - 2));
  };

  const switchQuestionType = (qIndex: number, newType: QuestionForm['type']) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      let options = q.options;
      let correctAnswer = q.correctAnswer;

      if (newType === 'TRUE_FALSE') {
        options = [
          { label: 'A', text: "To'g'ri", image: null },
          { label: 'B', text: "Noto'g'ri", image: null },
        ];
        correctAnswer = '';
      } else if (q.type === 'TRUE_FALSE' && newType !== 'OPEN_ENDED') {
        options = [
          { label: 'A', text: '', image: null },
          { label: 'B', text: '', image: null },
          { label: 'C', text: '', image: null },
          { label: 'D', text: '', image: null },
        ];
        correctAnswer = '';
      } else if (newType === 'OPEN_ENDED' || newType === 'FILL_BLANK') {
        correctAnswer = '';
      } else if (newType === 'MULTIPLE_CHOICE' && correctAnswer.includes(',')) {
        correctAnswer = correctAnswer.split(',')[0] || '';
      }

      const blankAnswers = newType === 'FILL_BLANK' ? [''] : q.blankAnswers;

      updated[qIndex] = { ...q, type: newType, options, correctAnswer, blankAnswers };
      return updated;
    });
  };

  // "Bo'shliq qo'shish" tugmasi — savol matni ichiga kursor turgan joyga
  // "___" belgisini qo'yadi.
  const insertBlankMarker = (qIndex: number) => {
    const el = questionTextRef.current;
    const text = questions[qIndex]?.text || '';
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);

    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], text: `${before}${FILL_BLANK_MARKER}${after}` };
      return updated;
    });

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = before.length + FILL_BLANK_MARKER.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const toggleCorrectAnswer = (qIndex: number, label: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      if (q.type === 'MULTI_SELECT') {
        const set = new Set((q.correctAnswer || '').split(',').filter(Boolean));
        if (set.has(label)) set.delete(label); else set.add(label);
        updated[qIndex] = { ...q, correctAnswer: Array.from(set).sort().join(',') };
      } else {
        updated[qIndex] = { ...q, correctAnswer: label };
      }
      return updated;
    });
  };

  // SAVE TEST
  const handleSave = async (publish: boolean) => {
    if (!testInfo.titleUz || !testInfo.subjectId) {
      alert("Test nomi va fan tanlash majburiy!");
      setCurrentStep('info');
      return;
    }

    const validQuestions = questions.filter(isQuestionValid);
    if (validQuestions.length === 0) {
      alert("Kamida 1 ta savol kiritilishi kerak (matn + to'g'ri javob)!");
      setCurrentStep('questions');
      return;
    }

    setSaving(true);
    try {
      // Update test info
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleUz: testInfo.titleUz,
          duration: testInfo.duration,
          isFree: testInfo.accessType === 'free',
          price: testInfo.accessType === 'paid' ? testInfo.price : 0,
          accessType: testInfo.accessType,
          difficulty: testInfo.difficulty,
          coverImage: testInfo.coverImage || null,
          isPublished: publish,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Xatolik yuz berdi");
        setSaving(false);
        return;
      }

      // Update questions via dedicated endpoint
      const questionsRes = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: validQuestions.map((q, index) => {
            const isFillBlank = q.type === 'FILL_BLANK';
            return {
            id: q.id || undefined,
            text: q.text,
            images: q.images,
            options: (q.type === 'OPEN_ENDED' || isFillBlank) ? [] : q.options.filter(o => o.text),
            correctAnswer: isFillBlank ? fillBlankCorrectAnswer(q) : q.correctAnswer,
            explanation: q.explanation || null,
            explanationImages: q.explanationImages,
            videoUrl: q.videoUrl || null,
            type: q.type,
            points: q.points || 1,
            topic: q.topic || null,
            bloomLevel: q.bloomLevel || null,
            difficulty: q.difficulty || null,
            order: index,
            };
          }),
        }),
      });

      if (questionsRes.ok) {
        alert(publish ? "Test yangilandi va nashr qilindi!" : "Test yangilandi (qoralama)!");
        router.push('/teacher/tests');
      } else {
        const qData = await questionsRes.json();
        alert(qData.error || "Savollarni saqlashda xatolik");
      }
    } catch (error) {
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher/tests" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Testni tahrirlash</h1>
            <p className="text-sm text-text-secondary">Savollarni va ma&apos;lumotlarni yangilang</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Saqlash
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Nashr qilish
          </button>
        </div>
      </motion.div>

      {/* Step tabs */}
      <div className="flex gap-2">
        {[
          { id: 'info' as const, label: "Test ma'lumotlari", icon: FileUp },
          { id: 'questions' as const, label: `Savollar (${questions.length})`, icon: Plus },
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStep === step.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            <step.icon size={16} />
            {step.label}
          </button>
        ))}
      </div>

      {/* STEP: INFO */}
      {currentStep === 'info' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Test nomi *</label>
              <input
                type="text"
                value={testInfo.titleUz}
                onChange={(e) => setTestInfo({ ...testInfo, titleUz: e.target.value })}
                placeholder="Masalan: DTM Matematika #1"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
              <select
                value={testInfo.subjectId}
                onChange={(e) => setTestInfo({ ...testInfo, subjectId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Fan tanlang...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.nameUz} ({s.category.nameUz})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Davomiyligi (daqiqa)</label>
              <input
                type="number"
                value={testInfo.duration}
                onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) || 60 })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Qiyinlik (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={testInfo.difficulty}
                onChange={(e) => setTestInfo({ ...testInfo, difficulty: parseInt(e.target.value) || 3 })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-3">Test kirish turi *</label>
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
                  onClick={() => {
                    const isFree = opt.key === 'free';
                    setTestInfo({ ...testInfo, accessType: opt.key, isFree, price: isFree ? 0 : testInfo.price });
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    testInfo.accessType === opt.key
                      ? `${opt.color} shadow-sm`
                      : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {testInfo.accessType === 'paid' && (
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm font-medium text-text-primary">Narx:</label>
                <input
                  type="number"
                  value={testInfo.price}
                  onChange={(e) => setTestInfo({ ...testInfo, price: parseInt(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                />
                <span className="text-sm text-text-secondary">so&apos;m</span>
              </div>
            )}
          </div>

          {/* Cover image upload */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Test bosh rasmi (ixtiyoriy)
            </label>
            <div className="flex items-center gap-4">
              <ImageUploadButton
                endpoint="questionImage"
                label="Bosh rasm yuklash"
                onUpload={(url) => setTestInfo({ ...testInfo, coverImage: url })}
              />
              {testInfo.coverImage && (
                <span className="text-xs text-green-600 font-medium">Rasm yuklandi</span>
              )}
            </div>
            {testInfo.coverImage && (
              <div className="mt-3 relative inline-block">
                <img
                  src={testInfo.coverImage}
                  alt="Test bosh rasmi"
                  className="h-32 w-auto object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={() => setTestInfo({ ...testInfo, coverImage: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* STEP: QUESTIONS */}
      {currentStep === 'questions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question list sidebar */}
          <div className="card p-4 space-y-2 h-fit">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">Savollar</h3>
              <span className="text-xs text-text-secondary">{questions.length} ta</span>
            </div>
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQuestion(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                  i === activeQuestion ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {i + 1}-savol
                  {q.type === 'OPEN_ENDED' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Ochiq</span>
                  )}
                  {q.type === 'MULTI_SELECT' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Ko&apos;p tanlovli</span>
                  )}
                  {q.type === 'TRUE_FALSE' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">T/N</span>
                  )}
                  {q.type === 'FILL_BLANK' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">Bo&apos;shliq</span>
                  )}
                </span>
                {isQuestionValid(q) && <CheckCircle size={12} className="text-green-500" />}
              </button>
            ))}
            <button
              onClick={addQuestion}
              className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition-colors border border-dashed border-primary-200"
            >
              <Plus size={14} /> Savol qo&apos;shish
            </button>
          </div>

          {/* Question editor */}
          <div className="lg:col-span-3 card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">{activeQuestion + 1}-savol</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  Ball:
                  <input
                    type="text"
                    inputMode="numeric"
                    value={questions[activeQuestion]?.points ?? 1}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === '' ? 1 : parseInt(val);
                      if (val === '' || (!isNaN(num) && num >= 1 && num <= 100)) {
                        const updated = [...questions];
                        updated[activeQuestion] = { ...updated[activeQuestion], points: val === '' ? 1 : num };
                        setQuestions(updated);
                      }
                    }}
                    className="w-14 px-2 py-1 rounded-lg border border-border text-center text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
                  />
                </label>
                <button onClick={() => removeQuestion(activeQuestion)} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Question text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">
                  Savol matni * <span className="text-xs text-text-secondary">(LaTeX: $formula$)</span>
                </label>
                <ImageUploadButton
                  endpoint="questionImage"
                  label="Rasm qo'shish"
                  onUpload={(url) => {
                    const updated = [...questions];
                    updated[activeQuestion] = {
                      ...updated[activeQuestion],
                      images: [...updated[activeQuestion].images, url],
                    };
                    setQuestions(updated);
                  }}
                />
              </div>
              <LatexToolbar
                targetRef={questionTextRef}
                value={questions[activeQuestion]?.text || ''}
                onChange={(text) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text };
                  setQuestions(updated);
                }}
                className="mb-1.5"
              />
              <textarea
                ref={questionTextRef}
                value={questions[activeQuestion]?.text || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text: e.target.value };
                  setQuestions(updated);
                }}
                onPaste={(e) => {
                  const file = extractPastedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'question');
                  }
                }}
                onDrop={(e) => {
                  const file = extractDroppedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'question');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                placeholder="Savolni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
              />
              {dropUploading === 'question' && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
                </p>
              )}
              <ImagePreviewList
                images={questions[activeQuestion]?.images || []}
                onRemove={(index) => {
                  const updated = [...questions];
                  updated[activeQuestion] = {
                    ...updated[activeQuestion],
                    images: updated[activeQuestion].images.filter((_, i) => i !== index),
                  };
                  setQuestions(updated);
                }}
              />
              {questions[activeQuestion]?.text && (
                <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Ko&apos;rinishi:</p>
                  <LatexRenderer content={questions[activeQuestion].text} className="text-sm text-text-primary" />
                </div>
              )}
            </div>

            {/* Question type toggle */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Savol turi</label>
              <div className="inline-flex flex-wrap rounded-xl border border-border overflow-hidden">
                {([
                  { key: 'MULTIPLE_CHOICE' as const, label: 'Variantli' },
                  { key: 'MULTI_SELECT' as const, label: "Ko'p tanlovli" },
                  { key: 'TRUE_FALSE' as const, label: "To'g'ri/Noto'g'ri" },
                  { key: 'OPEN_ENDED' as const, label: 'Ochiq' },
                  { key: 'FILL_BLANK' as const, label: "Bo'shliqni to'ldirish" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => switchQuestionType(activeQuestion, opt.key)}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      questions[activeQuestion]?.type === opt.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-text-secondary hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FILL_BLANK: per-blank accepted answers */}
            {questions[activeQuestion]?.type === 'FILL_BLANK' ? (
              <FillBlankEditor
                question={questions[activeQuestion]}
                onInsertBlank={() => insertBlankMarker(activeQuestion)}
                onBlankAnswersChange={(blankAnswers) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], blankAnswers };
                  setQuestions(updated);
                }}
              />
            ) : questions[activeQuestion]?.type === 'OPEN_ENDED' ? (
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">
                  To&apos;g&apos;ri javob (matn) *
                </label>
                <input
                  type="text"
                  value={questions[activeQuestion]?.correctAnswer || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], correctAnswer: e.target.value };
                    setQuestions(updated);
                  }}
                  placeholder="Javobni kiriting (masalan: 42, 3.14)"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                />
              </div>
            ) : (
            /* MULTIPLE_CHOICE / TRUE_FALSE / MULTI_SELECT: options */
            <div>
              <label className="text-sm font-medium text-text-primary block mb-3">Javob variantlari *</label>
              <div className="space-y-3">
                {questions[activeQuestion]?.options.map((opt, optIndex) => {
                  const isMulti = questions[activeQuestion]?.type === 'MULTI_SELECT';
                  const isChecked = isMulti
                    ? (questions[activeQuestion]?.correctAnswer || '').split(',').includes(opt.label)
                    : questions[activeQuestion]?.correctAnswer === opt.label;
                  return (
                  <div key={optIndex} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCorrectAnswer(activeQuestion, opt.label)}
                        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold mt-2 transition-all ${isMulti ? 'rounded-md' : 'rounded-full'} ${
                          isChecked
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-border text-text-secondary hover:border-primary-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[activeQuestion].options[optIndex].text = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder={`${opt.label} variantini kiriting`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                          />
                          {questions[activeQuestion]?.type !== 'TRUE_FALSE' && (
                            <ImageUploadButton
                              endpoint="optionImage"
                              label="Rasm"
                              onUpload={(url) => {
                                const updated = [...questions];
                                updated[activeQuestion].options[optIndex].image = url;
                                setQuestions(updated);
                              }}
                            />
                          )}
                          {optIndex === 4 && (
                            <button onClick={() => removeOption(activeQuestion, optIndex)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {opt.image && (
                          <div className="relative inline-block ml-1">
                            <img
                              src={opt.image}
                              alt={`${opt.label} rasmi`}
                              className="h-12 w-auto object-contain rounded-lg border border-border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...questions];
                                updated[activeQuestion].options[optIndex].image = null;
                                setQuestions(updated);
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]"
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
                {questions[activeQuestion]?.type !== 'TRUE_FALSE' && questions[activeQuestion]?.options.length < 5 && (
                  <button onClick={() => addOption(activeQuestion)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11">
                    <Plus size={12} /> E variantini qo&apos;shish
                  </button>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-2 ml-11">
                {questions[activeQuestion]?.type === 'MULTI_SELECT'
                  ? "Yashil kvadrat = to'g'ri javob. Bir nechtasini belgilashingiz mumkin."
                  : "Yashil doira = to'g'ri javob. Belgilash uchun harf tugmasini bosing."}
              </p>
            </div>
            )}

            {/* Topic tag, Bloom level & difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-border">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Mavzu tegi (ixtiyoriy)</label>
                <input
                  type="text"
                  value={questions[activeQuestion]?.topic || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], topic: e.target.value };
                    setQuestions(updated);
                  }}
                  placeholder="Masalan: Kvadrat tenglama"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Bloom darajasi (ixtiyoriy)</label>
                <select
                  value={questions[activeQuestion]?.bloomLevel || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], bloomLevel: e.target.value };
                    setQuestions(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                >
                  <option value="">Tanlanmagan</option>
                  {BLOOM_LEVELS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Qiyinlik darajasi (ixtiyoriy)</label>
                <select
                  value={questions[activeQuestion]?.difficulty ?? ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], difficulty: e.target.value ? Number(e.target.value) : null };
                    setQuestions(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                >
                  <option value="">Tanlanmagan</option>
                  <option value="1">1 — Juda oson</option>
                  <option value="2">2 — Oson</option>
                  <option value="3">3 — O&apos;rta</option>
                  <option value="4">4 — Qiyin</option>
                  <option value="5">5 — Juda qiyin</option>
                </select>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Yozma yechim (ixtiyoriy)</label>
                <ImageUploadButton
                  endpoint="solutionImage"
                  label="Yechim rasmi"
                  onUpload={(url) => {
                    const updated = [...questions];
                    updated[activeQuestion] = {
                      ...updated[activeQuestion],
                      explanationImages: [...updated[activeQuestion].explanationImages, url],
                    };
                    setQuestions(updated);
                  }}
                />
              </div>
              <LatexToolbar
                targetRef={explanationRef}
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(explanation) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation };
                  setQuestions(updated);
                }}
                className="mb-1.5"
              />
              <textarea
                ref={explanationRef}
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation: e.target.value };
                  setQuestions(updated);
                }}
                onPaste={(e) => {
                  const file = extractPastedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'explanation');
                  }
                }}
                onDrop={(e) => {
                  const file = extractDroppedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'explanation');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                placeholder="Yechimni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
              />
              {dropUploading === 'explanation' && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
                </p>
              )}
              <ImagePreviewList
                images={questions[activeQuestion]?.explanationImages || []}
                onRemove={(index) => {
                  const updated = [...questions];
                  updated[activeQuestion] = {
                    ...updated[activeQuestion],
                    explanationImages: updated[activeQuestion].explanationImages.filter((_, i) => i !== index),
                  };
                  setQuestions(updated);
                }}
              />
            </div>

            {/* Video */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Video yechim URL (ixtiyoriy)</label>
              <input
                type="url"
                value={questions[activeQuestion]?.videoUrl || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], videoUrl: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
