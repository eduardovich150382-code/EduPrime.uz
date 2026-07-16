'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  ArrowLeft, Plus, Trash2, Image, Upload, Bot,
  Save, FileUp, CheckCircle, Loader2, Send,
} from 'lucide-react';
import ImageUploadButton, { ImagePreviewList } from '@/components/ui/ImageUploadButton';

interface QuestionForm {
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  correctAnswer: string;
  explanation: string;
  explanationImages: string[];
  videoUrl: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
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
};

export default function CreateTestPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [testInfo, setTestInfo] = useState({
    titleUz: '',
    categoryType: '',
    subjectId: '',
    duration: 60,
    isFree: false,
    price: 0,
    difficulty: 3,
    videoSolution: '',
    coverImage: '',
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentStep, setCurrentStep] = useState<'info' | 'questions' | 'ai-import'>('info');
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Fetch subjects
  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(data => {
        if (data.subjects) setSubjects(data.subjects);
      })
      .catch(console.error);
  }, []);

  // Category type options
  const categoryTypeOptions = [
    { label: 'DTM', value: 'DTM' },
    { label: 'Maktab', value: 'SCHOOL' },
    { label: 'Attestatsiya', value: 'ATTESTATION' },
    { label: 'SAT', value: 'SAT' },
    { label: 'GRE', value: 'GRE' },
    { label: 'Milliy sertifikat', value: 'CERTIFICATE' },
    { label: 'Prezident maktabi', value: 'PRESIDENT_SCHOOL' },
  ];

  // Filter subjects by selected category type
  const filteredSubjects = testInfo.categoryType
    ? subjects.filter(s => s.category.type === testInfo.categoryType)
    : subjects;

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

  // SAVE TEST
  const handleSave = async (publish: boolean) => {
    if (!testInfo.categoryType) {
      alert("Kategoriya turini tanlash majburiy!");
      setCurrentStep('info');
      return;
    }
    if (!testInfo.titleUz || !testInfo.subjectId) {
      alert("Test nomi va fan tanlash majburiy!");
      setCurrentStep('info');
      return;
    }

    const validQuestions = questions.filter(q => q.text && q.correctAnswer);
    if (validQuestions.length === 0) {
      alert("Kamida 1 ta savol kiritilishi kerak (matn + to'g'ri javob)!");
      setCurrentStep('questions');
      return;
    }

    setSaving(true);
    try {
      // Exclude categoryType from the request body - it's only used for client-side filtering
      const { categoryType, ...testData } = testInfo;

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testData,
          questions: validQuestions.map(q => ({
            text: q.text,
            images: q.images,
            options: q.type === 'OPEN_ENDED' ? [] : q.options.filter(o => o.text),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            explanationImages: q.explanationImages,
            videoUrl: q.videoUrl || null,
            type: q.type,
            points: 1,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Publish if requested
        if (publish && data.test?.id) {
          await fetch(`/api/tests/${data.test.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublished: true }),
          });
        }
        alert(publish ? "Test yaratildi va nashr qilindi! ✅" : "Test saqlandi (qoralama)!");
        router.push('/teacher');
      } else {
        alert(data.error || "Xatolik yuz berdi");
      }
    } catch (error) {
      alert("Server xatolik. Qayta urinib ko'ring.");
    }
    setSaving(false);
  };

  // AI IMPORT
  const handleAiImport = async () => {
    if (!aiText.trim()) {
      alert("Matn kiriting!");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: aiText }),
      });
      const data = await res.json();
      setAiResult(data);

      // Import questions
      if (data.questions?.length > 0) {
        const imported: QuestionForm[] = data.questions.map((q: any) => ({
          text: q.text || '',
          images: q.images || [],
          options: q.type === 'OPEN_ENDED' ? [] : (q.options || [
            { label: 'A', text: '', image: null },
            { label: 'B', text: '', image: null },
            { label: 'C', text: '', image: null },
            { label: 'D', text: '', image: null },
          ]),
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          explanationImages: [],
          videoUrl: '',
          type: q.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
        }));
        setQuestions(imported);
        setActiveQuestion(0);
        setCurrentStep('questions');
      }
    } catch (error) {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
    setAiLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Yangi test yaratish</h1>
            <p className="text-sm text-text-secondary">Savollarni qo&apos;lda kiriting yoki AI bilan import qiling</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Qoralama
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
          { id: 'ai-import' as const, label: 'AI Import', icon: Bot },
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
              <label className="text-sm font-medium text-text-primary block mb-2">Kategoriya turi *</label>
              <select
                value={testInfo.categoryType}
                onChange={(e) => setTestInfo({ ...testInfo, categoryType: e.target.value, subjectId: '' })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Kategoriya turini tanlang...</option>
                {categoryTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
              <select
                value={testInfo.subjectId}
                onChange={(e) => setTestInfo({ ...testInfo, subjectId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Fan tanlang...</option>
                {filteredSubjects.map((s) => (
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
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testInfo.isFree}
                onChange={(e) => setTestInfo({ ...testInfo, isFree: e.target.checked, price: 0 })}
                className="w-5 h-5 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-text-primary">Bepul test</span>
            </label>
            {!testInfo.isFree && (
              <div className="flex items-center gap-2">
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
          <p className="text-xs text-text-secondary bg-green-50 p-3 rounded-lg border border-green-100">
            💡 Bepul test belgilasangiz — barcha foydalanuvchilar bu testni va uning yechimlarini bepul ko&apos;ra oladi
          </p>

          {/* General video solution */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Umumiy videoyechim URL (ixtiyoriy)
            </label>
            <input
              type="url"
              value={testInfo.videoSolution}
              onChange={(e) => setTestInfo({ ...testInfo, videoSolution: e.target.value })}
              placeholder="https://youtube.com/watch?v=... (barcha savollar uchun bitta umumiy video)"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
            <p className="text-xs text-text-secondary mt-1">
              Bu video test natijasi sahifasida &quot;Umumiy videoyechim&quot; sifatida ko&apos;rsatiladi
            </p>
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
            <p className="text-xs text-text-secondary mt-2">
              Agar rasm yuklanmasa, test chiroyli rang gradientida ko&apos;rsatiladi
            </p>
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
                </span>
                {q.text && q.correctAnswer && <CheckCircle size={12} className="text-green-500" />}
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
              <button onClick={() => removeQuestion(activeQuestion)} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
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
              <textarea
                value={questions[activeQuestion]?.text || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="Savolni kiriting..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
              />
              {/* Question images preview */}
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

            {/* Options */}
            <div>
              {/* Question type toggle */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-primary block mb-2">Savol turi</label>
                <div className="inline-flex rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => {
                      const updated = [...questions];
                      updated[activeQuestion] = { ...updated[activeQuestion], type: 'MULTIPLE_CHOICE' };
                      setQuestions(updated);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      questions[activeQuestion]?.type !== 'OPEN_ENDED'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-text-secondary hover:bg-gray-50'
                    }`}
                  >
                    Variantli
                  </button>
                  <button
                    onClick={() => {
                      const updated = [...questions];
                      updated[activeQuestion] = { ...updated[activeQuestion], type: 'OPEN_ENDED', correctAnswer: '' };
                      setQuestions(updated);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      questions[activeQuestion]?.type === 'OPEN_ENDED'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-text-secondary hover:bg-gray-50'
                    }`}
                  >
                    Ochiq
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {questions[activeQuestion]?.type === 'OPEN_ENDED'
                    ? "Ochiq savol — foydalanuvchi javobni qo'lda kiritadi (masalan: son, formula natijasi)"
                    : "Variantli savol — foydalanuvchi A, B, C, D variantlardan tanlaydi"}
                </p>
              </div>

              {/* OPEN_ENDED: text input for correct answer */}
              {questions[activeQuestion]?.type === 'OPEN_ENDED' ? (
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
                  <p className="text-xs text-text-secondary mt-2">
                    Javobni talaba yozishi kerak bo&apos;lgan shaklda kiriting. Katta-kichik harf farq qilmaydi, lekin formatga e&apos;tibor bering (masalan: 3.14, emas 3,14).
                  </p>
                </div>
              ) : (
              /* MULTIPLE_CHOICE: options */
              <div>
              <label className="text-sm font-medium text-text-primary block mb-3">Javob variantlari *</label>
              <div className="space-y-3">
                {questions[activeQuestion]?.options.map((opt, optIndex) => (
                  <div key={optIndex} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          const updated = [...questions];
                          updated[activeQuestion] = { ...updated[activeQuestion], correctAnswer: opt.label };
                          setQuestions(updated);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold mt-2 transition-all ${
                          questions[activeQuestion]?.correctAnswer === opt.label
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
                          <ImageUploadButton
                            endpoint="optionImage"
                            label="Rasm"
                            onUpload={(url) => {
                              const updated = [...questions];
                              updated[activeQuestion].options[optIndex].image = url;
                              setQuestions(updated);
                            }}
                          />
                          {optIndex === 4 && (
                            <button onClick={() => removeOption(activeQuestion, optIndex)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {/* Option image preview */}
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
                ))}
                {questions[activeQuestion]?.options.length < 5 && (
                  <button onClick={() => addOption(activeQuestion)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11">
                    <Plus size={12} /> E variantini qo&apos;shish
                  </button>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-2 ml-11">
                Yashil doira = to&apos;g&apos;ri javob. Belgilash uchun harf tugmasini bosing.
              </p>
              </div>
              )}
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
              <textarea
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="Yechimni kiriting..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
              />
              {/* Explanation images preview */}
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

      {/* STEP: AI IMPORT */}
      {currentStep === 'ai-import' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="text-center mb-4">
            <Bot size={32} className="text-primary-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-text-primary">AI bilan import qilish</h2>
            <p className="text-sm text-text-secondary">Test matnini kiriting — AI savollarni avtomatik ajratib beradi</p>
          </div>

          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder={`Test matnini shu yerga kiriting yoki paste qiling...\n\nMasalan:\n1. 2+2=?\nA) 3\nB) 4\nC) 5\nD) 6\nJavob: B\n\n2. Uchburchak ichki burchaklari yig'indisi?\nA) 90°\nB) 180°\nC) 270°\nD) 360°\nJavob: B`}
            rows={12}
            className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              💡 AI (Gemini Flash) bepul. Formulalarni LaTeX ga o&apos;giradi.
            </p>
            <button
              onClick={handleAiImport}
              disabled={aiLoading || !aiText.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
              {aiLoading ? 'Tahlil qilinmoqda...' : 'AI bilan import'}
            </button>
          </div>

          {aiResult && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 font-medium">
                ✅ {aiResult.totalFound || aiResult.questions?.length || 0} ta savol topildi va import qilindi!
              </p>
              {aiResult.warnings?.length > 0 && (
                <p className="text-xs text-yellow-700 mt-1">
                  ⚠️ {aiResult.warnings.join(', ')}
                </p>
              )}
              <p className="text-xs text-green-600 mt-2">
                &quot;Savollar&quot; tabiga o&apos;tib tekshiring va tasdiqlang.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
